/**
 * 截取小帆 hubei 管理端 /manage/index（或当前页）整页图。
 *
 * 方式 A — 自动登录（仅本机环境变量，勿提交、勿贴到聊天）：
 *   export XFKJ_USER='手机号或账号'
 *   export XFKJ_PASSWORD='…'
 *   npm run xfkj:screenshot
 *   默认无头；要看浏览器：XFKJ_HEADLESS=0
 *
 * 方式 B — 已保存过会话（同机再次截图，免再输密码）：
 *   先在某次成功登录后设 XFKJ_SAVE_STATE=1 会生成 apps/web/.xfkj-auth.json
 *   之后：XFKJ_USE_SAVED=1 npm run xfkj:screenshot
 *
 * 方式 C — 手动（推荐：你先在浏览器里登录好再截图）：
 *   不要设置 XFKJ_USER / XFKJ_PASSWORD。脚本会打开 Chrome 到小帆登录页；你在窗口里
 *   完成登录并进入要对标的页面（如应用中心），回到终端按 Enter，即保存整页截图。
 *
 * 方式 D — 连接「已经在跑的」Chrome（你在日常浏览器里先登录，再让脚本只负责截图）：
 *   1）先退出 Chrome，再用调试端口启动（示例 macOS）：
 *      /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222
 *   2）在浏览器里打开 xfkj、登录并进入要对标的标签页
 *   3）XFKJ_CDP_URL=http://127.0.0.1:9222 npm run xfkj:screenshot
 *      终端按 Enter 后截取当前选中的 xfkj 标签页（整页）。仅断开 Playwright 连接，不替你关浏览器。
 *
 * 可选：OUT=/path/to/out.png
 * 调试失败页：XFKJ_DEBUG=1 会在 apps/web 写出 xfkj-login-debug.png / .html
 *
 * 目录说明：在仓库根目录用 cd apps/web；若终端提示符已在 …/web，勿再 cd apps/web。
 */
import { existsSync } from 'node:fs'
import * as readline from 'node:readline'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { blockDestructiveHttp, tryAutoLoginCredentials } from './xfkj-playwright-helpers.mjs'
import { chromium } from 'playwright'

const __dirname = dirname(fileURLToPath(import.meta.url))
const defaultOut = join(__dirname, '..', 'xfkj-manage-index.png')
const defaultState = join(__dirname, '..', '.xfkj-auth.json')
const outPath = process.env.OUT || defaultOut
const statePath = process.env.XFKJ_STATE_FILE || defaultState

const LOGIN =
  'https://hubei.xfkj.cc/manage/login?url=' + encodeURIComponent('/manage/index')
const TARGET = 'https://hubei.xfkj.cc/manage/index'

const xfkUser = process.env.XFKJ_USER
const xfkPass = process.env.XFKJ_PASSWORD || process.env.XFKJ_PASS
const auto = Boolean(xfkUser && xfkPass)
const useSaved = process.env.XFKJ_USE_SAVED === '1' && existsSync(statePath)
const cdpUrl = process.env.XFKJ_CDP_URL || ''

/** 自动登录默认无头；手动默认有界面 */
const headless = useSaved
  ? process.env.XFKJ_HEADLESS !== '0'
  : auto
    ? process.env.XFKJ_HEADLESS !== '0'
    : process.env.XFKJ_HEADLESS === '1'

function waitLine(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(prompt, () => {
      rl.close()
      resolve()
    })
  })
}

/** 从已通过 CDP 连接的浏览器里挑一个 xfkj 标签页（优先非登录页） */
function pickXfkjPage(browser) {
  /** @type {import('playwright').Page[]} */
  const pages = []
  for (const ctx of browser.contexts()) {
    pages.push(...ctx.pages())
  }
  if (!pages.length) {
    throw new Error('未找到任何标签页：请先打开 Chrome 并保留至少一个窗口')
  }
  const xfkj = pages.filter((p) => /xfkj\.cc/i.test(p.url()))
  const ready = xfkj.find((p) => !/\/login/i.test(p.url()))
  if (ready) return ready
  if (xfkj.length) return xfkj[0]
  return pages[0]
}

/** @type {import('playwright').Browser} */
let browser
/** @type {import('playwright').Page} */
let page

if (cdpUrl) {
  if (auto || useSaved) {
    console.warn(
      '提示：已设置 XFKJ_CDP_URL，仅对已打开的 Chrome 截图，本次忽略自动登录与 XFKJ_USE_SAVED。',
    )
    console.warn('')
  }
  browser = await chromium.connectOverCDP(cdpUrl)
  page = pickXfkjPage(browser)
  await blockDestructiveHttp(page.context())
  await page.bringToFront().catch(() => {})
  console.log('')
  console.log('—— 已 CDP 连接浏览器 ——')
  console.log('当前将截图的标签：', page.url())
  console.log('若不是要对标的页面，请在 Chrome 里先切换到含 xfkj.cc 的标签，再回终端。')
  console.log('')
  await waitLine('页面就绪后按 Enter 保存整页截图… ')
} else {
  browser = await chromium.launch({
    headless,
    channel: 'chrome',
  })

  const contextOpts = {
    viewport: { width: 1440, height: 900 },
    locale: 'zh-CN',
  }
  if (useSaved) {
    Object.assign(contextOpts, { storageState: statePath })
  }

  const context = await browser.newContext(contextOpts)
  await blockDestructiveHttp(context)
  page = await context.newPage()

  try {
    if (useSaved) {
      console.log('使用已保存会话：', statePath)
      await page.goto(TARGET, { waitUntil: 'networkidle', timeout: 90000 })
      if (page.url().includes('/login')) {
        console.error(
          '会话已失效，请去掉 XFKJ_USE_SAVED 并用账号密码重新登录一次（可加 XFKJ_SAVE_STATE=1）。',
        )
        process.exit(1)
      }
    } else {
      await page
        .goto(LOGIN, {
          waitUntil: 'networkidle',
          timeout: 90000,
        })
        .catch(() => page.goto(LOGIN, { waitUntil: 'domcontentloaded', timeout: 60000 }))
      if (auto) {
        console.log('自动登录中（凭证来自本机环境变量）…')
        const r = await tryAutoLoginCredentials(page, xfkUser, xfkPass)
        if (!r.ok) {
          console.error(r.reason)
          process.exit(1)
        }
        if (!page.url().includes('manage/index')) {
          await page.goto(TARGET, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {})
        }
        if (process.env.XFKJ_SAVE_STATE === '1') {
          await context.storageState({ path: statePath })
          console.log('已保存会话到（勿提交 git）：', statePath)
        }
      } else {
        console.log('')
        console.log('—— 已在 Chrome 中打开小帆登录页 ——')
        console.log('1. 你在浏览器里登录，并进入要对标的页面（如应用中心）。')
        console.log('2. 回到本终端按 Enter，脚本保存整页截图。')
        console.log('')
        await waitLine('登录完成且页面正确后，按 Enter 保存整页截图… ')
      }
    }

    if (auto || useSaved) {
      await new Promise((r) => setTimeout(r, 1500))
    }
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
}

try {
  await page.screenshot({ path: outPath, fullPage: true })

  console.log('')
  console.log('已保存：', outPath)
  console.log('')
} catch (e) {
  console.error(e)
  process.exit(1)
} finally {
  await browser.close()
}
