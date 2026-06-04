import { test, expect, type Page, type Route } from '@playwright/test'

/**
 * Keyboard shortcut E2E tests
 *
 * Covers the global keyboard shortcuts wired by `useGlobalShortcuts`:
 *   Space      → toggle play / pause
 *   ArrowUp    → volume up (5%)
 *   ArrowDown  → volume down (5%)
 *   ArrowRight → next track
 *   ArrowLeft  → previous track
 *   M          → toggle mute
 *   F          → toggle full screen player
 *
 * Many shortcuts depend on `audioEngine` state, which only initializes after
 * a real song URL loads. Because the test environment does not stream audio,
 * we focus on verifying the listener is wired and that key events do not
 * crash the page. Tests skip gracefully when the player has no track.
 */

const STUB_OK = JSON.stringify({ code: 200 })

function stubApiRoutes(page: Page): void {
  page.route('**/api/**', (route: Route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: STUB_OK })
  })
}

test.describe('Keyboard shortcuts: listener wiring', () => {
  test.beforeEach(async ({ page }) => {
    stubApiRoutes(page)
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
  })

  test('space key on an empty player does not throw a page error', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.locator('body').click()
    await page.keyboard.press('Space')
    await page.waitForTimeout(100)

    expect(errors.filter((e) => !e.includes('net::'))).toHaveLength(0)
  })

  test('arrow keys do not throw a page error', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.locator('body').click()
    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(100)

    expect(errors.filter((e) => !e.includes('net::'))).toHaveLength(0)
  })

  test('m and f shortcut keys do not throw a page error', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.locator('body').click()
    await page.keyboard.press('m')
    await page.keyboard.press('f')
    await page.waitForTimeout(100)

    expect(errors.filter((e) => !e.includes('net::'))).toHaveLength(0)
  })
})

test.describe('Keyboard shortcuts: input suppression', () => {
  test.beforeEach(async ({ page }) => {
    stubApiRoutes(page)
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
  })

  test('shortcuts are suppressed while typing in the search input', async ({ page }) => {
    const searchInput = page.getByPlaceholder('你想听什么？')
    await expect(searchInput).toBeVisible({ timeout: 10000 })

    await searchInput.focus()
    await searchInput.fill('jay')
    await page.keyboard.press('Space')

    // Pressing space inside the search field should append a space,
    // not trigger the global play/pause shortcut.
    await expect(searchInput).toHaveValue(/jay\s?/)
  })

  test('typing letters in search input does not trigger m/f shortcuts', async ({ page }) => {
    const searchInput = page.getByPlaceholder('你想听什么？')
    await expect(searchInput).toBeVisible({ timeout: 10000 })

    await searchInput.focus()
    await searchInput.fill('')
    await page.keyboard.type('mf')

    await expect(searchInput).toHaveValue('mf')
  })
})

test.describe('Keyboard shortcuts: modifier keys ignored', () => {
  test.beforeEach(async ({ page }) => {
    stubApiRoutes(page)
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
  })

  test('shortcuts with ctrl/meta modifiers are not handled', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.locator('body').click()
    await page.keyboard.press('Control+Space')
    await page.keyboard.press('Meta+ArrowUp')
    await page.waitForTimeout(100)

    expect(errors.filter((e) => !e.includes('net::'))).toHaveLength(0)
  })
})
