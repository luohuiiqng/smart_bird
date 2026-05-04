/**
 * 小帆 manage 登录页：自动填表 + 点击 / 回车 等（供截图脚本、open-login 脚本复用）
 *
 * 安全约定：自动化不得对小帆官网执行删除。见 blockDestructiveHttp。
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * 对 xfkj 站点禁用破坏性 HTTP：默认拦截 DELETE（不少站点亦用 POST 删数据，脚本无法无损推断，故仅拦 DELETE）。
 * 自动化脚本不得点击「删除」类按钮；爬页仅 navigation，不触发业务删改。
 * 若确有合规运维需求：设 XFKJ_ALLOW_DELETE=1 关闭拦截（慎用）。
 *
 * @param {import('playwright').BrowserContext} context
 */
export async function blockDestructiveHttp(context) {
  if (process.env.XFKJ_ALLOW_DELETE === '1') return
  await context.route('**/*', (route) => {
    const m = route.request().method().toUpperCase()
    if (m === 'DELETE') {
      console.warn('[xfkj-safety] 已阻止 DELETE：', route.request().url())
      return route.abort('failed')
    }
    return route.continue()
  })
}

export async function clickLoginControl(scope) {
  const attempts = [
    () => scope.locator('form').getByRole('button', { name: /登录/ }),
    () => scope.locator('form').locator('input[type="submit"][value*="登录"]'),
    () => scope.locator('form').locator('input[type="submit"][value="登录"]'),
    () => scope.locator('form').locator('input[type="button"][value*="登录"]'),
    () => scope.locator('form').locator('a').filter({ hasText: /^\s*登录\s*$/ }).first(),
    () => scope.locator('form').locator('.layui-btn').filter({ hasText: /^\s*登录\s*$/ }).first(),
    () => scope.locator('form').getByText('登录', { exact: true }),
    () => scope.getByRole('button', { name: /登录/ }),
    () => scope.locator('input[type="submit"][value*="登录"]'),
    () => scope.locator('input[type="submit"][value="登录"]'),
    () => scope.locator('input[type="button"][value*="登录"]'),
    () => scope.locator('a').filter({ hasText: /^\s*登录\s*$/ }).first(),
    () => scope.locator('button[type="submit"]').filter({ hasText: /^\s*登录\s*$/ }),
    () => scope.locator('.layui-btn').filter({ hasText: /^\s*登录\s*$/ }).first(),
    () => scope.getByText('登录', { exact: true }),
    () => scope.locator('form').locator('input[type="submit"]').first(),
    () => scope.locator('input[type="submit"]').first(),
    () => scope.locator('form').getByRole('button', { name: /按钮/ }),
    () => scope.locator('form').locator('input[type="submit"][value="按钮"]'),
    () => scope.locator('form').locator('.layui-btn').filter({ hasText: /^\s*按钮\s*$/ }).first(),
    () => scope.locator('form').getByText('按钮', { exact: true }),
    () => scope.getByRole('button', { name: /^按钮$/ }),
    () => scope.locator('input[type="submit"][value="按钮"]'),
    () => scope.locator('.layui-btn').filter({ hasText: /^\s*按钮\s*$/ }).first(),
  ]
  for (const mk of attempts) {
    for (const force of [false, true]) {
      const loc = mk()
      const n = await loc.count().catch(() => 0)
      if (!n) continue
      const el = loc.first()
      const visible = await el.isVisible().catch(() => false)
      if (!visible && !force) continue
      try {
        await el.click({ timeout: 15000, force })
        return true
      } catch {
        /* try next */
      }
    }
  }
  return false
}

export async function waitLeftLoginPage(page, ms = 12000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    const u = page.url().toLowerCase()
    if (!u.includes('/login')) return true
    await new Promise((r) => setTimeout(r, 150))
  }
  return !page.url().toLowerCase().includes('/login')
}

export async function dumpLoginDebug(page) {
  if (process.env.XFKJ_DEBUG !== '1') return
  const base = join(__dirname, '..', 'xfkj-login-debug')
  await page.screenshot({ path: `${base}.png`, fullPage: true })
  writeFileSync(`${base}.html`, await page.content())
  console.error('')
  console.error('XFKJ_DEBUG：已写入', `${base}.png`, '与', `${base}.html`)
}

/**
 * @returns {Promise<{ ok: true } | { ok: false, reason: string }>}
 */
export async function tryAutoLoginCredentials(page, user, pass) {
  await page.waitForLoadState('load')
  await page.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {})
  await page
    .waitForSelector('input[type="password"]', { state: 'visible', timeout: 30000 })
    .catch(() => null)

  const main = page.mainFrame()
  const roots = [main, ...page.frames().filter((f) => f !== main)]

  let target = null
  for (const root of roots) {
    const passInput = root.locator('input[type="password"]').first()
    if (await passInput.count()) {
      target = root
      break
    }
  }

  if (!target) {
    await dumpLoginDebug(page)
    return { ok: false, reason: '未找到密码输入框（可能需手动登录或页面结构已变）' }
  }

  const byPlaceholder = target.getByPlaceholder(/手机|阅卷|邮箱/)
  if (await byPlaceholder.count()) {
    await byPlaceholder.first().fill(user, { timeout: 15000 })
  } else {
    const byUser = target
      .locator('input[type="text"], input:not([type="password"]):not([type="hidden"])')
      .first()
    await byUser.fill(user, { timeout: 15000 })
  }
  const passLoc = target.locator('input[type="password"]').first()
  await passLoc.fill(pass, { timeout: 15000 })
  await new Promise((r) => setTimeout(r, 400))

  await passLoc.press('Enter')
  if (await waitLeftLoginPage(page, 12000)) return { ok: true }

  const formEl = target.locator('form').first()
  if (await formEl.count()) {
    await formEl
      .evaluate((f) => {
        if (typeof HTMLFormElement.prototype.requestSubmit === 'function') {
          try {
            f.requestSubmit()
            return
          } catch {
            /* fallthrough */
          }
        }
        f.submit()
      })
      .catch(() => {})
    if (await waitLeftLoginPage(page, 12000)) return { ok: true }
  }

  const tryFrames = [target, main, ...page.frames().filter((f) => f !== main && f !== target)]
  let clicked = false
  for (const f of tryFrames) {
    if (await clickLoginControl(f)) {
      clicked = true
      break
    }
  }
  if (!clicked) {
    await dumpLoginDebug(page)
    return { ok: false, reason: '找不到登录按钮（或需验证码）' }
  }

  await page
    .waitForURL((url) => !url.pathname.toLowerCase().includes('/login'), { timeout: 90000 })
    .catch(() => null)
  if (page.url().toLowerCase().includes('/login')) {
    await dumpLoginDebug(page)
    return { ok: false, reason: '仍在登录页：密码错误、需验证码等' }
  }
  return { ok: true }
}
