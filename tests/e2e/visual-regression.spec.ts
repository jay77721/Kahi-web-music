import { test, expect, type Page, type Route } from '@playwright/test'

/**
 * Visual regression E2E tests
 *
 * Captures stable screenshots of key surfaces at the canonical breakpoints
 * and compares them against baseline images. Baselines are generated on
 * first run with `pnpm test:e2e --update-snapshots`.
 *
 * Animations are disabled and caret rendering is hidden to keep snapshots
 * deterministic. API responses are stubbed so visuals do not depend on a
 * live backend.
 */

const STUB_OK = JSON.stringify({ code: 200 })
const VIEWPORTS = [
  { width: 320, height: 568, label: 'mobile-320' },
  { width: 768, height: 1024, label: 'tablet-768' },
  { width: 1440, height: 900, label: 'desktop-1440' },
] as const

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
    return route.fulfill({ status: 200, contentType: 'application/json', body: STUB_OK })
  })
}

/**
 * Wait for the page to be visually idle before taking a snapshot:
 *   - domcontentloaded fires
 *   - network goes quiet
 *   - fonts have loaded
 */
async function waitForVisualReady(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded')
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.evaluate(() => document.fonts?.ready).catch(() => {})
}

test.describe('Visual regression: home page', () => {
  for (const viewport of VIEWPORTS) {
    test(`home page snapshot at ${viewport.label}`, async ({ page }) => {
      stubApiRoutes(page)
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto('/')
      await waitForVisualReady(page)

      await expect(page).toHaveScreenshot(`home-${viewport.label}.png`, {
        fullPage: false,
        animations: 'disabled',
        caret: 'hide',
        maxDiffPixelRatio: 0.02,
      })
    })
  }
})

test.describe('Visual regression: playlist detail', () => {
  for (const viewport of VIEWPORTS) {
    test(`playlist page snapshot at ${viewport.label}`, async ({ page }) => {
      stubApiRoutes(page)
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto('/playlist/3001')
      await waitForVisualReady(page)

      await expect(page).toHaveScreenshot(`playlist-${viewport.label}.png`, {
        fullPage: false,
        animations: 'disabled',
        caret: 'hide',
        maxDiffPixelRatio: 0.02,
      })
    })
  }
})

test.describe('Visual regression: login page', () => {
  for (const viewport of VIEWPORTS) {
    test(`login page snapshot at ${viewport.label}`, async ({ page }) => {
      stubApiRoutes(page)
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto('/login')
      await waitForVisualReady(page)

      await expect(page).toHaveScreenshot(`login-${viewport.label}.png`, {
        fullPage: false,
        animations: 'disabled',
        caret: 'hide',
        maxDiffPixelRatio: 0.02,
      })
    })
  }
})

test.describe('Visual regression: search page', () => {
  for (const viewport of VIEWPORTS) {
    test(`search page snapshot at ${viewport.label}`, async ({ page }) => {
      stubApiRoutes(page)
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto('/search')
      await waitForVisualReady(page)

      await expect(page).toHaveScreenshot(`search-${viewport.label}.png`, {
        fullPage: false,
        animations: 'disabled',
        caret: 'hide',
        maxDiffPixelRatio: 0.02,
      })
    })
  }
})
