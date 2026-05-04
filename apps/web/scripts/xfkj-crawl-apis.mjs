/**
 * 登录小帆 manage 后，广度优先（BFS）遍历同源业务链接：每打开一页都会从当前 DOM（含 iframe）
 * 继续发现新链接并入队，直至达到 XFKJ_MAX_PAGES 或队列耗尽。
 *
 * 在 apps/web 下执行：
 *   npm run xfkj:crawl-apis
 *
 * 环境变量（可选）：
 *   XFKJ_LOGIN_URL    默认 https://www.xfkj.cc/manage/login
 *   XFKJ_USER / XFKJ_PASSWORD   自动登录；不设则等待手动登录
 *   XFKJ_HEADLESS=1   无头（默认有界面）
 *   XFKJ_MANAGE_PATH_SEGMENTS=8  /manage/ 下路径最大深度（段数），过小会漏掉深层菜单
 *   XFKJ_MAX_PAGES=250   最多访问多少个**不同页面**（默认 250；原先仅首页扫一圈往往只有 ~10 条）
 *   XFKJ_MAX_QUEUE=3000  待访问队列上限，防止异常膨胀
 *   XFKJ_OUT=./xfkj-api-inventory.json
 *   XFKJ_EXTRA_URLS  逗号分隔的额外种子 URL
 *   XFKJ_PAGE_SETTLE_MS   每页额外等待（默认 3500）
 *   XFKJ_CAPTURE_WIDE=1   宽口径记录请求
 *
 * 安全：不对官网做任何删除；并对浏览器上下文拦截 HTTP DELETE。
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { blockDestructiveHttp, tryAutoLoginCredentials } from './xfkj-playwright-helpers.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const LOGIN_URL = process.env.XFKJ_LOGIN_URL || 'https://www.xfkj.cc/manage/login'
const user = process.env.XFKJ_USER
const pass = process.env.XFKJ_PASSWORD || process.env.XFKJ_PASS
const maxPages = Math.max(1, Number(process.env.XFKJ_MAX_PAGES || '250'))
const maxQueue = Math.max(maxPages, Number(process.env.XFKJ_MAX_QUEUE || '3000'))
const maxSeg = Math.max(2, Number(process.env.XFKJ_MANAGE_PATH_SEGMENTS || '8'))
const outFile = process.env.XFKJ_OUT || join(__dirname, '..', 'xfkj-api-inventory.json')
const headless = process.env.XFKJ_HEADLESS === '1'
const settleMs = Math.max(0, Number(process.env.XFKJ_PAGE_SETTLE_MS ?? '3500'))
const captureWide = process.env.XFKJ_CAPTURE_WIDE === '1'

const STATIC_RE =
  /\.(css|js|mjs|map|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot|mp4|webm)(\?|$)/i

/** @param {import('playwright').Request} req */
function shouldRecordRequest(req, origin) {
  const url = req.url()
  const t = req.resourceType()
  if (!url.startsWith(origin)) return false
  if (STATIC_RE.test(url)) return false
  if (t === 'xhr' || t === 'fetch') return true
  if (/\.(ashx|asmx)(\?|$)/i.test(url)) return true
  if (/\/(api|ajax)\b/i.test(url)) return true
  if (t === 'document' && req.method() !== 'GET') return true
  if (t === 'websocket' || t === 'eventsource') return true
  if (!captureWide) return false
  if (/\.(aspx|ashx|asmx|do)(\?|$)/i.test(url)) return true
  if (/\/(pages|fenxi|liankao|manage)\b/i.test(url) && t === 'document' && req.method() === 'GET')
    return true
  return false
}

function normalizeUrl(u) {
  try {
    const x = new URL(u)
    x.hash = ''
    return x.toString()
  } catch {
    return u
  }
}

function pathSegmentCount(pathname) {
  return pathname.replace(/\/$/, '').split('/').filter(Boolean).length
}

function isCandidateManagePage(origin, href) {
  let u
  try {
    u = new URL(href)
  } catch {
    return false
  }
  if (u.origin !== origin) return false
  const p = u.pathname.toLowerCase()
  if (p.includes('/login') || p.includes('/logout')) return false
  if (!p.startsWith('/manage')) return false
  const n = pathSegmentCount(u.pathname)
  return n >= 2 && n <= maxSeg
}

function isCrawlTargetPage(origin, href) {
  let u
  try {
    u = new URL(href)
  } catch {
    return false
  }
  if (u.origin !== origin) return false
  const p = u.pathname.toLowerCase()
  if (p.includes('/login') || p.includes('/logout')) return false
  return (
    p.startsWith('/manage') ||
    p.startsWith('/pages') ||
    p.startsWith('/fenxi') ||
    p.startsWith('/liankao')
  )
}

/** @param {string} href */
function acceptDiscoveredUrl(origin, href) {
  if (!isCrawlTargetPage(origin, href)) return false
  try {
    const u = new URL(href)
    if (u.pathname.toLowerCase().startsWith('/manage')) {
      return isCandidateManagePage(origin, href)
    }
    return true
  } catch {
    return false
  }
}

/**
 * 从单帧 DOM 收集所有 a[href]
 */
function collectAnchorsInDocument() {
  const selectors = [
    '.menu_list a[href]',
    '.main_menu a[href]',
    '.layui-side a[href]',
    'aside a[href]',
    '.xfkj-shell a[href]',
    '[class*="menu_list"] a[href]',
    '[class*="side"] a[href]',
    'nav a[href]',
    '.H_yj a[href]',
    '.main_box a[href]',
    '.a_top a[href]',
    '.top_right a[href]',
    '.a_btm a[href]',
    '.layui-table a[href]',
    '.layui-tab a[href]',
  ]
  const seen = new Set()
  const out = []
  for (const sel of selectors) {
    try {
      document.querySelectorAll(sel).forEach((a) => {
        const href = a.getAttribute('href')
        if (!href || href.startsWith('javascript') || href === '#') return
        try {
          const abs = new URL(href, window.location.href).href
          if (!seen.has(abs)) {
            seen.add(abs)
            out.push(abs)
          }
        } catch {
          /* ignore */
        }
      })
    } catch {
      /* ignore */
    }
  }
  document.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href')
    if (!href || href.startsWith('javascript')) return
    try {
      const abs = new URL(href, window.location.href).href
      if (!seen.has(abs)) {
        seen.add(abs)
        out.push(abs)
      }
    } catch {
      /* ignore */
    }
  })
  return out
}

/**
 * @param {import('playwright').Page} page
 * @param {string} origin
 */
async function extractBusinessLinksFromDom(page, origin) {
  const normalized = new Set()
  for (const frame of page.frames()) {
    let raw = []
    try {
      raw = await frame.evaluate(collectAnchorsInDocument)
    } catch {
      continue
    }
    for (const h of raw) {
      if (!acceptDiscoveredUrl(origin, h)) continue
      normalized.add(normalizeUrl(h))
    }
  }
  return [...normalized]
}

/**
 * @param {import('playwright').Page} page
 * @param {Set<string>} bucket
 * @param {string} origin
 */
function attachRequestCollector(page, bucket, origin) {
  const onReq = (req) => {
    if (!shouldRecordRequest(req, origin)) return
    const key = `${req.method()}\t${req.resourceType()}\t${normalizeUrl(req.url())}`
    bucket.add(key)
  }
  page.on('request', onReq)
  return () => page.off('request', onReq)
}

async function main() {
  const browser = await chromium.launch({
    headless,
    channel: 'chrome',
  })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'zh-CN',
  })
  await blockDestructiveHttp(context)
  const page = await context.newPage()

  const globalApis = new Set()
  const perPage = []

  try {
    console.log('')
    console.log('打开登录页：', LOGIN_URL)
    await page
      .goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: 90000 })
      .catch(() => page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 }))

    if (user && pass) {
      console.log('尝试自动登录…')
      const r = await tryAutoLoginCredentials(page, user, pass)
      if (!r.ok) {
        console.warn('自动登录失败：', r.reason)
        console.warn('请在浏览器中手动完成登录，脚本将等待离开 /login …')
      }
    } else {
      console.log('未配置 XFKJ_USER：请在浏览器中手动登录。')
    }

    await page.waitForURL((url) => !url.pathname.toLowerCase().includes('/login'), {
      timeout: 600_000,
    })

    const origin = new URL(page.url()).origin
    console.log('')
    console.log('已登录，起始页：', page.url())
    console.log(
      '同源：',
      origin,
      '| /manage/ 路径最多',
      maxSeg,
      '段 | 最多访问',
      maxPages,
      '个页面 | BFS 队列上限',
      maxQueue,
    )
    console.log(
      '每页再等',
      settleMs,
      'ms；接口少则 XFKJ_CAPTURE_WIDE=1',
    )

    await page.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {})

    /** @type {string[]} */
    const queue = []
    /** @type {Set<string>} */
    const pending = new Set()
    /** @type {Set<string>} */
    const visited = new Set()

    /** @returns {boolean} 是否新入队 */
    function enqueue(url) {
      const n = normalizeUrl(url)
      if (!acceptDiscoveredUrl(origin, n)) return false
      if (visited.has(n) || pending.has(n)) return false
      if (queue.length >= maxQueue) return false
      pending.add(n)
      queue.push(n)
      return true
    }

    const seedCurrent = normalizeUrl(page.url())
    if (acceptDiscoveredUrl(origin, seedCurrent)) enqueue(seedCurrent)

    const initialLinks = await extractBusinessLinksFromDom(page, origin)
    console.log('首页（当前页）初次解析链接数：', initialLinks.length)
    for (const link of initialLinks) enqueue(link)

    const extra = (process.env.XFKJ_EXTRA_URLS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    for (const e of extra) {
      try {
        enqueue(normalizeUrl(e))
      } catch {
        /* ignore */
      }
    }

    let visitRound = 0
    while (queue.length > 0 && visitRound < maxPages) {
      const targetUrl = queue.shift()
      pending.delete(targetUrl)
      if (visited.has(targetUrl)) continue
      visited.add(targetUrl)
      visitRound++

      const pageApis = new Set()
      const detach = attachRequestCollector(page, pageApis, origin)

      console.log(`[${visitRound}/${maxPages}]`, targetUrl, '| 待队列', queue.length)
      try {
        await page.goto(targetUrl, {
          waitUntil: 'networkidle',
          timeout: 90000,
        })
      } catch {
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 90000 })
      }
      await page.waitForLoadState('domcontentloaded').catch(() => {})
      await page
        .evaluate(() => window.scrollTo(0, Math.min(document.body.scrollHeight, 1600)))
        .catch(() => {})
      await new Promise((r) => setTimeout(r, settleMs))

      const discoveredHere = await extractBusinessLinksFromDom(page, origin)
      let newLinks = 0
      for (const d of discoveredHere) {
        if (enqueue(d)) newLinks++
      }
      if (newLinks) console.log('    └ 本页新入队链接 +', newLinks)

      detach()
      for (const x of pageApis) globalApis.add(x)

      const list = [...pageApis].sort().map((line) => {
        const parts = line.split('\t')
        const method = parts[0]
        const resourceType = parts[1]
        const url = parts.slice(2).join('\t')
        return { method, resourceType, url }
      })
      perPage.push({
        pageUrl: targetUrl,
        title: await page.title().catch(() => ''),
        apiCount: list.length,
        apis: list,
      })
    }

    if (queue.length > 0 && visitRound >= maxPages) {
      console.warn('')
      console.warn('已达到 XFKJ_MAX_PAGES=', maxPages, '，尚有', queue.length, '个 URL 未访问。可提高该环境变量后重跑。')
    }

    const allApis = [...globalApis]
      .sort()
      .map((line) => {
        const parts = line.split('\t')
        const method = parts[0]
        const resourceType = parts[1]
        const url = parts.slice(2).join('\t')
        return { method, resourceType, url }
      })

    const report = {
      generatedAt: new Date().toISOString(),
      loginUrl: LOGIN_URL,
      origin,
      crawlMode: 'bfs',
      maxPathSegmentsManage: maxSeg,
      maxPagesVisited: maxPages,
      maxQueue,
      pageSettleMs: settleMs,
      captureWide,
      pagesActuallyVisited: perPage.length,
      urlsRemainingInQueue: queue.length,
      uniqueUrlsVisited: [...visited],
      allApisUnique: allApis,
      byPage: perPage,
    }

    writeFileSync(outFile, JSON.stringify(report, null, 2), 'utf8')
    console.log('')
    console.log('完成。实际访问', perPage.length, '个页面；去重请求', allApis.length, '条。')
    console.log('已写入：', outFile)
    console.log('')
  } catch (e) {
    console.error(e)
    process.exitCode = 1
  } finally {
    await browser.close()
  }
}

await main()
