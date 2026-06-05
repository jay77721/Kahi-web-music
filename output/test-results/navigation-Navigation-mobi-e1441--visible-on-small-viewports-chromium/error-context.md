# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: navigation.spec.ts >> Navigation: mobile hamburger menu >> hamburger menu button is visible on small viewports
- Location: tests\e2e\navigation.spec.ts:124:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: '菜单' })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByRole('button', { name: '菜单' })

```

```yaml
- link "跳到主内容":
  - /url: "#main-content"
- banner:
  - searchbox "搜索音乐"
  - link "登录":
    - /url: /login
    - button "登录"
- main:
  - heading "下午好" [level=1]
  - region "最近播放":
    - heading "最近播放" [level=2]
    - status:
      - paragraph: 还没有播放记录
      - paragraph: 播放歌曲后会在这里显示
  - text: 暂无推荐内容
  - list "Bento discover grid":
    - listitem:
      - link "私人雷达 — 根据你的听歌口味生成的专属推荐":
        - /url: /discover/radar
        - heading "私人雷达" [level=3]
        - paragraph: 根据你的听歌口味生成的专属推荐
    - listitem:
      - link "新歌速递 — 每日 10 首最新单曲":
        - /url: /discover/newsongs
        - heading "新歌速递" [level=3]
        - paragraph: 每日 10 首最新单曲
- navigation:
  - link "首页":
    - /url: /
  - link "搜索":
    - /url: /search
  - link "收藏":
    - /url: /liked
  - link "我的":
    - /url: /my
  - link "设置":
    - /url: /settings
- region "Notifications alt+T"
- alert
```

# Test source

```ts
  27  |       return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, playlist: { id: 1, name: 'Test', tracks: [] } }) })
  28  |     }
  29  |     if (url.includes('/album')) {
  30  |       return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, album: { id: 1, name: 'Test' }, songs: [] }) })
  31  |     }
  32  |     return route.fulfill({ status: 200, contentType: 'application/json', body: STUB_OK })
  33  |   })
  34  | }
  35  | 
  36  | test.describe('Navigation: top-level routes', () => {
  37  |   test.beforeEach(async ({ page }) => {
  38  |     stubApiRoutes(page)
  39  |   })
  40  | 
  41  |   test('home page renders with a visible heading', async ({ page }) => {
  42  |     await page.goto('/')
  43  |     await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 })
  44  |   })
  45  | 
  46  |   test('search page loads under /search route', async ({ page }) => {
  47  |     await page.goto('/search')
  48  |     await expect(page.locator('body')).toBeVisible()
  49  |     await expect(page).toHaveURL(/\/search/)
  50  |   })
  51  | 
  52  |   test('leaderboard page loads under /leaderboard route', async ({ page }) => {
  53  |     await page.goto('/leaderboard')
  54  |     await expect(page.locator('body')).toBeVisible()
  55  |     await expect(page).toHaveURL(/\/leaderboard/)
  56  |   })
  57  | 
  58  |   test('daily page redirects to login when not authenticated', async ({ page }) => {
  59  |     await page.goto('/daily')
  60  |     await expect(page.locator('body')).toBeVisible()
  61  |     // /daily requires auth — unauthenticated users should be redirected to /login
  62  |     await expect(page).toHaveURL(/\/login/)
  63  |   })
  64  | 
  65  |   test('fm page loads under /fm route', async ({ page }) => {
  66  |     await page.goto('/fm')
  67  |     await expect(page.locator('body')).toBeVisible()
  68  |   })
  69  | 
  70  |   test('login page loads under /login route', async ({ page }) => {
  71  |     await page.goto('/login')
  72  |     await expect(page.locator('body')).toBeVisible()
  73  |   })
  74  | })
  75  | 
  76  | test.describe('Navigation: dynamic detail routes', () => {
  77  |   test.beforeEach(async ({ page }) => {
  78  |     stubApiRoutes(page)
  79  |   })
  80  | 
  81  |   test('playlist detail route renders for a numeric id', async ({ page }) => {
  82  |     await page.goto('/playlist/3001')
  83  |     await expect(page.locator('body')).toBeVisible()
  84  |     await expect(page).toHaveURL(/\/playlist\/3001/)
  85  |   })
  86  | 
  87  |   test('album detail route renders for a numeric id', async ({ page }) => {
  88  |     await page.goto('/album/201')
  89  |     await expect(page.locator('body')).toBeVisible()
  90  |     await expect(page).toHaveURL(/\/album\/201/)
  91  |   })
  92  | })
  93  | 
  94  | test.describe('Navigation: sidebar interaction', () => {
  95  |   test.beforeEach(async ({ page }) => {
  96  |     stubApiRoutes(page)
  97  |     await page.setViewportSize({ width: 1280, height: 720 })
  98  |   })
  99  | 
  100 |   test('sidebar exposes the search route via the header search form', async ({ page }) => {
  101 |     await page.goto('/')
  102 |     const searchInput = page.getByPlaceholder('你想听什么？')
  103 |     await expect(searchInput).toBeVisible({ timeout: 10000 })
  104 | 
  105 |     await searchInput.fill('jay')
  106 |     await searchInput.press('Enter')
  107 | 
  108 |     await expect(page).toHaveURL(/\/search\?q=jay/)
  109 |   })
  110 | 
  111 |   test('sidebar contains primary navigation links to leaderboard', async ({ page }) => {
  112 |     await page.goto('/')
  113 |     const navLinks = page.locator('aside a[href="/leaderboard"]')
  114 |     await expect(navLinks.first()).toBeVisible({ timeout: 10000 })
  115 |   })
  116 | })
  117 | 
  118 | test.describe('Navigation: mobile hamburger menu', () => {
  119 |   test.beforeEach(async ({ page }) => {
  120 |     stubApiRoutes(page)
  121 |     await page.setViewportSize({ width: 375, height: 812 })
  122 |   })
  123 | 
  124 |   test('hamburger menu button is visible on small viewports', async ({ page }) => {
  125 |     await page.goto('/')
  126 |     const menuButton = page.getByRole('button', { name: '菜单' })
> 127 |     await expect(menuButton).toBeVisible({ timeout: 10000 })
      |                              ^ Error: expect(locator).toBeVisible() failed
  128 |   })
  129 | 
  130 |   test('mobile bottom navigation is rendered on small viewports', async ({ page }) => {
  131 |     await page.goto('/')
  132 |     await page.waitForLoadState('domcontentloaded')
  133 |     const mobileNav = page.locator('nav.md\\:hidden').first()
  134 |     await expect(mobileNav).toBeVisible({ timeout: 10000 })
  135 |   })
  136 | })
  137 | 
  138 | test.describe('Navigation: route transitions', () => {
  139 |   test.beforeEach(async ({ page }) => {
  140 |     stubApiRoutes(page)
  141 |   })
  142 | 
  143 |   test('page transition shell wraps content with transition styles', async ({ page }) => {
  144 |     await page.goto('/')
  145 |     await expect(page.locator('body')).toBeVisible()
  146 |     // PageTransitionShell renders a wrapper; check that body has content
  147 |     const content = await page.locator('body').innerHTML()
  148 |     expect(content.length).toBeGreaterThan(0)
  149 |   })
  150 | 
  151 |   test('navigating between routes preserves application shell', async ({ page }) => {
  152 |     await page.setViewportSize({ width: 1280, height: 720 })
  153 |     await page.goto('/')
  154 |     await expect(page.locator('body')).toBeVisible()
  155 | 
  156 |     await page.goto('/search')
  157 |     await expect(page.locator('body')).toBeVisible()
  158 |     await expect(page).toHaveURL(/\/search/)
  159 |   })
  160 | })
  161 | 
```