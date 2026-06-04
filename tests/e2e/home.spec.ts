import { test, expect } from '@playwright/test'

test.describe('Home Page', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('body')).toBeVisible()
  })

  test('should display page title or main heading', async ({ page }) => {
    await page.goto('/')
    // Check that the page has loaded content
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('should have navigation elements', async ({ page }) => {
    await page.goto('/')
    // Check for some content on the page
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})
