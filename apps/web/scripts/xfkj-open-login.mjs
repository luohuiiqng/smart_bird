/**
 * 用 Playwright 打开小帆 manage 登录页，支持：
 * - 手动：不设 XFKJ_USER / XFKJ_PASSWORD，在浏览器里登录；离开后终端提示成功。
 * - 自动：export XFKJ_USER、XFKJ_PASSWORD（勿提交仓库），脚本尝试自动填写并登录。
 *
 * 用法（在 apps/web 下）：
 *   npm run xfkj:open-login
 * 可选：
 *   XFKJ_LOGIN_URL=https://www.xfkj.cc/manage/login
 *
 * 安全：不对官网执行删除；浏览器上下文会拦截 HTTP DELETE（勿手动在自动化会话内点删除）。
 */
import { execSync } from 'node:child_process'
import * as readline from 'node:readline'
import { chromium } from 'playwright'
import { blockDestructiveHttp, tryAutoLoginCredentials } from './xfkj-playwright-helpers.mjs'

const LOGIN_URL = process.env.XFKJ_LOGIN_URL || 'https://www.xfkj.cc/manage/login'
const user = process.env.XFKJ_USER
const pass = process.env.XFKJ_PASSWORD || process.env.XFKJ_PASS

function notifyMac() {
  if (process.platform !== 'darwin') return
  try {
    execSync(
      `osascript -e 'display notification "登录成功" with title "小帆 Playwright"'`,
      { stdio: 'ignore' },
    )
  } catch {
    /* ignore */
  }
}

function waitLine(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(prompt, () => {
      rl.close()
      resolve()
    })
  })
}

const browser = await chromium.launch({
  headless: false,
  channel: 'chrome',
})
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: 'zh-CN',
})
await blockDestructiveHttp(context)
const page = await context.newPage()

try {
  console.log('')
  console.log('打开：', LOGIN_URL)
  await page
    .goto(LOGIN_URL, {
      waitUntil: 'networkidle',
      timeout: 90000,
    })
    .catch(() => page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 }))

  if (user && pass) {
    console.log('检测到 XFKJ_USER / XFKJ_PASSWORD，尝试自动填写并登录…')
    const r = await tryAutoLoginCredentials(page, user, pass)
    if (!r.ok) {
      console.warn('')
      console.warn('自动登录未成功：', r.reason)
      console.warn('请在浏览器中手动完成登录（验证码等）。脚本会继续等待，直到地址栏离开 /login …')
      console.warn('')
    }
  } else {
    console.log('')
    console.log('未设置账号密码：请在浏览器窗口中手动登录。')
    console.log('（可选：在本机 export XFKJ_USER、XFKJ_PASSWORD 后重新运行以自动填写）')
    console.log('')
  }

  await page.waitForURL(
    (url) => !url.pathname.toLowerCase().includes('/login'),
    { timeout: 600_000 },
  )

  console.log('')
  console.log('\x1b[32m✓ 小帆登录成功\x1b[0m')
  console.log('')
  console.log('当前页面：', page.url())
  console.log('')

  notifyMac()
} catch (e) {
  if (e?.name === 'TimeoutError') {
    console.error('')
    console.error('等待超时（10 分钟内未离开登录页）。')
  } else {
    console.error(e)
  }
  process.exitCode = 1
} finally {
  console.log('')
  await waitLine('按 Enter 关闭浏览器… ')
  await browser.close()
}
