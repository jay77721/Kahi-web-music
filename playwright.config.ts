import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for Kahi Music.
 *
 * - Cross-browser coverage: Chromium (always), WebKit + Firefox (gated by
 *   PW_ALL_BROWSERS=1 so local runs stay fast).
 * - Workers capped at 4 locally and 1 on CI to keep memory predictable.
 * - Reporter: `html` for human review, `list` for local feedback, `dot`
 *   on CI for compact output.
 */

const isCi = !!process.env.CI
const runAllBrowsers = process.env.PW_ALL_BROWSERS === '1'
const playwrightPort = process.env.PLAYWRIGHT_PORT ?? '3101'
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${playwrightPort}`
const shouldStartWebServer = !process.env.PLAYWRIGHT_BASE_URL

const baseProjects = [
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
  },
]

const extendedProjects = [
  {
    name: 'firefox',
    use: { ...devices['Desktop Firefox'] },
  },
  {
    name: 'webkit',
    use: { ...devices['Desktop Safari'] },
  },
]

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  workers: isCi ? 1 : 4,
  reporter: isCi
    ? [['dot'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
    },
  },
  projects: runAllBrowsers ? [...baseProjects, ...extendedProjects] : baseProjects,
  ...(shouldStartWebServer
    ? {
        webServer: {
          command: `pnpm exec next dev --hostname 127.0.0.1 --port ${playwrightPort}`,
          url: baseURL,
          reuseExistingServer: !isCi,
          timeout: 120_000,
        },
      }
    : {}),
})
