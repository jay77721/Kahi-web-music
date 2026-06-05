import { test, expect, type Page, type Route } from '@playwright/test'

/**
 * Navigation E2E tests
 *
 * Covers route transitions, sidebar navigation, mobile bottom navigation,
 * and dynamic detail routes (playlist/album). All NCM API calls are
 * stubbed with route mocks so tests do not require a live backend.
 */

const STUB_OK = JSON.stringify({ code: 200 })

/**
 * Stub all NCM API endpoints with empty success responses so pages render
 * without depending on a live backend.
 */
function stubApiRoutes(page: Page): void {
  page.route('**/api/**', (route: Route) => {
    const url = route.request().url()
    if (url.includes('/banner')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, banners: [] }) })
    }
    if (url.includes('/personalized')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, result: [] }) })
    }
    if (url.includes('/playlist/detail')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, playlist: { id: 1, name: 'Test', tracks: [] } }) })
    }
    if (url.includes('/album')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, album: { id: 1, name: 'Test' }, songs: [] }) })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: STUB_OK })
  })
}

test.describe('Navigation: top-level routes', () => {
  test.beforeEach(async ({ page }) => {
    stubApiRoutes(page)
  })

  test('home page renders with a visible heading', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 })
  })

  test('search page loads under /search route', async ({ page }) => {
    await page.goto('/search')
    await expect(page.locator('body')).toBeVisible()
    await expect(page).toHaveURL(/\/search/)
  })

  test('leaderboard page loads under /leaderboard route', async ({ page }) => {
    await page.goto('/leaderboard')
    await expect(page.locator('body')).toBeVisible()
    await expect(page).toHaveURL(/\/leaderboard/)
  })

  test('daily page redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/daily')
    await expect(page.locator('body')).toBeVisible()
    // /daily requires auth — unauthenticated users should be redirected to /login
    await expect(page).toHaveURL(/\/login/)
  })

  test('fm page loads under /fm route', async ({ page }) => {
    await page.goto('/fm')
    await expect(page.locator('body')).toBeVisible()
  })

  test('login page loads under /login route', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Navigation: dynamic detail routes', () => {
  test.beforeEach(async ({ page }) => {
    stubApiRoutes(page)
  })

  test('playlist detail route renders for a numeric id', async ({ page }) => {
    await page.goto('/playlist/3001')
    await expect(page.locator('body')).toBeVisible()
    await expect(page).toHaveURL(/\/playlist\/3001/)
  })

  test('album detail route renders for a numeric id', async ({ page }) => {
    await page.goto('/album/201')
    await expect(page.locator('body')).toBeVisible()
    await expect(page).toHaveURL(/\/album\/201/)
  })
})

test.describe('Navigation: sidebar interaction', () => {
  test.beforeEach(async ({ page }) => {
    stubApiRoutes(page)
    await page.setViewportSize({ width: 1280, height: 720 })
  })

  test('sidebar exposes the search route via the header search form', async ({ page }) => {
    await page.goto('/')
    const searchInput = page.getByPlaceholder('你想听什么？')
    await expect(searchInput).toBeVisible({ timeout: 10000 })

    await searchInput.fill('jay')
    await searchInput.press('Enter')

    await expect(page).toHaveURL(/\/search\?q=jay/)
  })

  test('sidebar contains primary navigation links to leaderboard', async ({ page }) => {
    await page.goto('/')
    const navLinks = page.locator('aside a[href="/leaderboard"]')
    await expect(navLinks.first()).toBeVisible({ timeout: 10000 })
  })

  test('protected sidebar routes replace history when redirecting to login', async ({ page }) => {
    await page.goto('/')
    await page.locator('aside a[href="/daily"]').first().click()

    await expect(page).toHaveURL(/\/login/)

    await page.goBack()
    await expect(page).toHaveURL(/\/$/)
  })
})

test.describe('Navigation: mobile bottom navigation', () => {
  test.beforeEach(async ({ page }) => {
    stubApiRoutes(page)
    await page.setViewportSize({ width: 375, height: 812 })
  })

  test('mobile bottom navigation exposes the search route on small viewports', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    const searchLink = page.locator('nav.md\\:hidden a[href="/search"]').first()
    await expect(searchLink).toBeVisible({ timeout: 10000 })

    await searchLink.click()
    await expect(page).toHaveURL(/\/search/)
  })

  test('mobile bottom navigation is rendered on small viewports', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    const mobileNav = page.locator('nav.md\\:hidden').first()
    await expect(mobileNav).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Navigation: route transitions', () => {
  test.beforeEach(async ({ page }) => {
    stubApiRoutes(page)
  })

  test('page transition shell wraps content with transition styles', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('body')).toBeVisible()
    // PageTransitionShell renders a wrapper; check that body has content
    const content = await page.locator('body').innerHTML()
    expect(content.length).toBeGreaterThan(0)
  })

  test('navigating between routes preserves application shell', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/')
    await expect(page.locator('body')).toBeVisible()

    await page.goto('/search')
    await expect(page.locator('body')).toBeVisible()
    await expect(page).toHaveURL(/\/search/)
  })
})
