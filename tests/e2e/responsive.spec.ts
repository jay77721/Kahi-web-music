import { test, expect, type Page, type Route } from '@playwright/test'

/**
 * Responsive layout E2E tests
 *
 * Verifies the application shell behaves correctly across the canonical
 * breakpoints used in design tokens:
 *   320  — small phone
 *   375  — standard mobile
 *   768  — tablet
 *   1024 — small desktop
 *   1440 — desktop
 *
 * Specifically:
 *   - sidebar visible on >= md (>= 768)
 *   - mobile bottom nav visible on < md (< 768)
 *   - main content never overflows horizontally
 */

const STUB_OK = JSON.stringify({ code: 200 })
const MOBILE_VIEWPORTS = [
  { width: 320, height: 568, label: 'iPhone SE small' },
  { width: 375, height: 812, label: 'iPhone 12 Pro' },
] as const
const DESKTOP_VIEWPORTS = [
  { width: 1024, height: 768, label: 'small desktop' },
  { width: 1440, height: 900, label: 'standard desktop' },
] as const

function stubApiRoutes(page: Page): void {
  page.route('**/api/**', (route: Route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: STUB_OK })
  })
}

async function assertNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement
    const body = document.body
    return Math.max(doc.scrollWidth, body.scrollWidth) - doc.clientWidth
  })
  // Allow a 2px tolerance for sub-pixel rounding.
  expect(overflow).toBeLessThanOrEqual(2)
}

test.describe('Responsive: mobile viewports', () => {
  for (const viewport of MOBILE_VIEWPORTS) {
    test(`mobile bottom nav is visible at ${viewport.label} (${viewport.width}px)`, async ({ page }) => {
      stubApiRoutes(page)
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto('/')
      await page.waitForLoadState('domcontentloaded')

      const mobileNav = page.locator('nav.md\\:hidden').first()
      await expect(mobileNav).toBeVisible({ timeout: 10000 })
    })

    test(`sidebar is hidden at ${viewport.label} (${viewport.width}px)`, async ({ page }) => {
      stubApiRoutes(page)
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto('/')
      await page.waitForLoadState('domcontentloaded')

      const sidebar = page.locator('aside.hidden.md\\:flex').first()
      // Tailwind `hidden md:flex` means hidden below md. Verify it is not visible.
      await expect(sidebar).toBeHidden()
    })

    test(`content does not overflow horizontally at ${viewport.width}px`, async ({ page }) => {
      stubApiRoutes(page)
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto('/')
      await page.waitForLoadState('domcontentloaded')

      await assertNoHorizontalOverflow(page)
    })
  }
})

test.describe('Responsive: desktop viewports', () => {
  for (const viewport of DESKTOP_VIEWPORTS) {
    test(`sidebar is visible at ${viewport.label} (${viewport.width}px)`, async ({ page }) => {
      stubApiRoutes(page)
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto('/')
      await page.waitForLoadState('domcontentloaded')

      const sidebar = page.locator('aside').first()
      await expect(sidebar).toBeVisible({ timeout: 10000 })
    })

    test(`mobile bottom nav is hidden at ${viewport.label} (${viewport.width}px)`, async ({ page }) => {
      stubApiRoutes(page)
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto('/')
      await page.waitForLoadState('domcontentloaded')

      const mobileNav = page.locator('nav.md\\:hidden')
      await expect(mobileNav).toBeHidden()
    })

    test(`content does not overflow horizontally at ${viewport.width}px`, async ({ page }) => {
      stubApiRoutes(page)
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto('/')
      await page.waitForLoadState('domcontentloaded')

      await assertNoHorizontalOverflow(page)
    })
  }
})

test.describe('Responsive: tablet breakpoint boundary', () => {
  test('search input is visible at the 768 breakpoint', async ({ page }) => {
    stubApiRoutes(page)
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')

    const searchInput = page.getByPlaceholder('你想听什么？')
    await expect(searchInput).toBeVisible({ timeout: 10000 })
  })

  test('header is visible at the 768 breakpoint', async ({ page }) => {
    stubApiRoutes(page)
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')

    const header = page.locator('header').first()
    await expect(header).toBeVisible({ timeout: 10000 })
  })
})
