# Kahi Music

> Web-based music player built on **Next.js 16**, interfacing with the **NetEase Cloud Music (NCM)** API.
> A premium, dark-themed listening experience with glassmorphism lyrics, a spinning vinyl, dynamic background color extraction, and a real-time audio spectrum visualizer.

![Status](https://img.shields.io/badge/status-active-success)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## ✨ Features

### Visual & Motion

- **Glassmorphism Lyrics Panel** — Frosted-glass lyrics surface with synced translation lines, smooth scroll-into-view, and a glow treatment on the active line.
- **Spinning Vinyl Record** — Album cover embedded in a slowly rotating disc with an animated tonearm. Disc pauses in place instead of resetting on toggle.
- **Dynamic Background Color Extraction** — Full-screen player's background is extracted from the current cover art (k-means over bucketed sRGB pixels) and painted as a soft radial gradient.
- **Real-time Audio Spectrum Visualizer** — Canvas-based 64-bar FFT visualizer tapped off the Howler.js master gain, with smooth decay when paused.
- **Bento Discover Grid** — 12-column mosaic layout with feature cards (Radar, New Songs, Hot Playlists, Artists) on the home page.
- **BentoCard & BentoGrid** — Reusable mosaic tile primitive with hover scale, accent-tinted glow, and cover-driven gradients.
- **Hero Banner** — Playlist / album detail pages with cover-color-tinted gradient, animated meta row, and a play CTA.
- **Page Transitions** — CSS-only fade + slide route changes via the `PageTransition` shell.
- **Stagger Animations** — SongTable rows enter with CSS stagger utilities for a polished first-paint.
- **prefers-reduced-motion** — All motion is disabled when the user prefers reduced motion, with deterministic fallbacks.

### Audio

- **Howler.js Audio Engine** — Single shared `AudioEngine` singleton wrapped around Howler with HTML5 streaming.
- **Four Play Modes** — Sequential, Shuffle, Repeat One, Repeat All, with the cycle action exposed in the UI.
- **Lyrics Sync** — LRC parsing, main + translation merging, and binary-searched active-line index.
- **Stream Retry** — `PlaybackController` retries the stream URL with lower bitrate (320k → 128k) on failure.

### UX

- **PWA** — Installable app shell with `manifest.json`, custom service worker, and offline fallback.
- **Service Worker Caching** — Stale-while-revalidate (HTML/JS/CSS), cache-first (images), network-first (API GETs, 5s timeout).
- **Keyboard Shortcuts** — `Space` play/pause, `←/→` prev/next, `↑/↓` volume, `M` mute, `F` full-screen.
- **Touch Gestures** — Mobile swipe: `←/→` switch tracks, `↑/↓` dismiss full-screen player.
- **Multi-select Songs** — Tri-state checkboxes in `SongTable` with a `BatchActionBar` for bulk operations.
- **Image Lazy Loading** — `BlurImage` fades cover art in after decode.
- **Lyrics Search** — Search by lyric text using the `cloudsearch` API with `type=1006`.
- **Cloud Disk** — View and play from your NCM cloud library at `/cloud`.
- **Recent Played** — Last 100 tracks persisted to localStorage and rendered on the home page.

### Architecture

- **API Proxy** — All NCM API calls flow through `app/api/[...path]/route.ts`, forwarding to `API_URL`. Handles cookie pass-through and CORS.
- **Client State** — Zustand stores for `player`, `ui`, `user`, `history`.
- **Server State** — SWR for data fetching with built-in dedup and revalidation.
- **Caching** — In-memory LRU-style cache inside `NcmApiClient` (5-minute TTL, 2-retry exponential backoff).
- **Type Safety** — TypeScript strict mode end-to-end with domain types in `types/`.
- **80% Test Coverage** — Vitest unit tests + Playwright E2E tests, both enforced in CI.

---

## 🛠 Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.2 |
| Language | TypeScript (strict) | 5.x |
| UI | React | 19.2 |
| Styling | Tailwind CSS | 4.x |
| Components | shadcn/ui + Radix | latest |
| State | Zustand | 5.x |
| Audio | Howler.js | 2.2 |
| Animation | CSS keyframes + reduced-motion utilities | native |
| Data Fetching | SWR | 2.x |
| Unit Testing | Vitest | 4.x |
| E2E Testing | Playwright | 1.60+ |
| PWA | native SW + manifest | — |
| Package Manager | pnpm | 9.x+ |

---

## 📦 Installation

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20+ |
| pnpm | 9+ |
| NCM API backend | running on `http://localhost:3000` |

### Steps

```bash
# 1. Clone the repository
git clone <your-fork-url> kahi-web-music
cd kahi-web-music

# 2. Install dependencies
pnpm install

# 3. Configure environment
cp .env.example .env.local
# → edit .env.local and set API_URL=http://localhost:3000

# 4. Start a compatible NCM backend (one of the options below)

# 5. Start the dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🚀 Development Commands

```bash
pnpm dev          # Start dev server (port 3000)
pnpm build        # Production build
pnpm start        # Run production server
pnpm lint         # ESLint
pnpm test         # Vitest (CI mode, single run)
pnpm test:watch   # Vitest (interactive)
pnpm test:coverage # Vitest with coverage report
pnpm test:e2e     # Playwright E2E
pnpm test:e2e:ui  # Playwright with UI mode
pnpm test:all     # Unit coverage + E2E
```

---

## 🔧 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|:--------:|---------|
| `API_URL` | NCM API backend URL (server-side only) | Yes | — |
| `NEXT_PUBLIC_API_URL` | Client-side API base URL. Leave empty to use same-origin `/api` proxy | No | `''` |

See [`.env.example`](./.env.example) for the full template with inline comments.

---

## 🏗 Project Structure

```
kahi-web-music/
├── app/                          # Next.js App Router
│   ├── api/                      # Server-side proxy → backend
│   │   ├── [...path]/route.ts    # Catch-all proxy
│   │   └── song/stream/          # Stream endpoint with retry
│   ├── album/                    # Album detail pages
│   ├── artist/                   # Artist pages
│   ├── cloud/                    # Cloud disk
│   ├── daily/                    # Daily recommendations
│   ├── fm/                       # Personal FM
│   ├── leaderboard/              # Top lists
│   ├── login/                    # Phone + captcha login
│   ├── mv/                       # MV pages
│   ├── my/                       # Liked / recent
│   ├── playlist/                 # Playlist detail
│   ├── radio/                    # Radio
│   ├── search/                   # Search + lyric search
│   ├── song/                     # Song detail
│   ├── user/                     # User profile
│   ├── layout.tsx                # Root layout: SW + shortcuts + toaster
│   ├── page.tsx                  # Home: greeting + Bento + Banner
│   └── globals.css               # Tailwind v4 + design tokens
│
├── components/
│   ├── comment/                  # CommentList
│   ├── common/                   # SongTable, Skeleton, transitions,
│   │                             # PlaylistCard, GlobalShortcuts, SW registrar
│   ├── discover/                 # Banner, BentoGrid, BentoCard,
│   │                             # NewSongList, RankingPreview, RecentPlayed
│   ├── layout/                   # AppShell, Header, Sidebar, MobileNav,
│   │                             # PageTransitionShell
│   ├── mv/                       # (reserved)
│   ├── player/                   # PlayerBar, MiniPlayer, FullScreenPlayer,
│   │                             # PlayQueue, LyricsPanel, VinylDisc,
│   │                             # Tonearm, SpectrumVisualizer,
│   │                             # PlaybackController
│   ├── playlist/                 # HeroBanner, MetadataBento
│   ├── search/                   # HotSearch, SearchResults,
│   │                             # LyricSearchResults, SearchHistory
│   ├── ui/                       # shadcn primitives (button, dialog, …)
│   └── user/                     # ProfileHeader
│
├── hooks/                        # Custom hooks
│   ├── useAudioAnalyser.ts       # Tap into Howler master gain
│   ├── useCaptchaCountdown.ts    # 60s SMS timer
│   ├── useDominantColor.ts       # k-means cover color extraction
│   ├── useDrag.ts                # Pointer drag
│   ├── useEqualizerBounce.ts     # Equalizer animation state
│   ├── useGlobalShortcuts.ts     # Space/←/→/↑/↓/M/F bindings
│   ├── useHealthCheck.ts         # Backend health probe
│   ├── useHover.ts               # Pointer hover state
│   ├── useInfiniteScroll.ts      # IntersectionObserver-driven paging
│   ├── useIntersectionObserver.ts
│   ├── useKeyboardShortcuts.ts   # Generic shortcut registry
│   ├── useMediaQuery.ts          # useIsMobile / useIsDesktop
│   ├── useMultiSelect.ts         # Tri-state selection
│   ├── useReducedMotion.ts       # OS-level motion preference
│   ├── useScrollProgress.ts      # Scroll percentage
│   ├── useSwipe.ts               # Touch swipe gestures
│   └── useWindowSize.ts
│
├── lib/                          # Pure libraries (no React)
│   ├── animations.ts             # CSS-compatible animation presets
│   ├── animations/               # index re-exports
│   ├── api.ts                    # NcmApiClient (REST + cache + retry)
│   ├── audio.ts                  # AudioEngine (Howler singleton)
│   ├── color.ts                  # sRGB → hex / oklch
│   ├── format.ts                 # Date/duration/artist helpers
│   ├── health.ts                 # Backend health probe
│   ├── lrc.ts                    # LRC parser
│   ├── spring-config.ts          # Spring animation presets
│   ├── storage.ts                # Typed localStorage wrapper
│   ├── sw-register.ts            # Service Worker registration
│   └── utils.ts                  # cn() + classname helpers
│
├── stores/                       # Zustand stores
│   ├── historyStore.ts           # Recent play history (≤100)
│   ├── playerStore.ts            # Playback, queue, mode, lyrics
│   ├── uiStore.ts                # Sidebar, theme, drawers, full-screen
│   └── userStore.ts              # Auth, profile, cookie
│
├── types/                        # Domain types
│   ├── album.ts, api.ts, artist.ts, comment.ts,
│   ├── dj.ts, index.ts, mv.ts,
│   ├── playlist.ts, song.ts, user.ts
│
├── public/                       # Static assets
│   ├── manifest.json             # PWA manifest
│   ├── sw.js                     # Service worker
│   └── icons/                    # PWA icons
│
├── tests/
│   ├── __tests__/                # Vitest unit tests
│   └── e2e/                      # Playwright E2E
│
├── docs/                         # Additional documentation
│   ├── ARCHITECTURE.md           # System design
│   ├── COMPONENTS.md             # Component reference
│   └── SHORTCUTS.md              # Keyboard & gesture reference
│
├── next.config.ts
├── tailwind config (PostCSS)
├── vitest.config.ts
├── playwright.config.ts
└── tsconfig.json
```

---

## 🧪 Testing

### Unit Tests (Vitest)

- Run with `pnpm test` (CI mode) or `pnpm test:watch` (interactive).
- Coverage threshold: **80%** across lines, branches, functions, statements.
- Tests live in `tests/__tests__/` mirroring the `lib/` and `stores/` layout.
- DOM environment via `jsdom`; React Testing Library for components.

### E2E Tests (Playwright)

- Run with `pnpm test:e2e`.
- Chromium-only by default; configured in `playwright.config.ts`.
- Covers home load, navigation, search, player controls, and keyboard shortcuts.

### Conventions

- Use **Arrange-Act-Assert** structure.
- One assertion concept per test.
- Test names describe behavior, e.g. `returns empty array when no markets match query`.

---

## 🛡 Code Conventions

| Concern | Convention |
|---------|-----------|
| TypeScript | strict mode, ES2017 target, no `any` |
| Components | PascalCase, `'use client'` when interactive |
| Hooks | `use` prefix |
| Stores | `xxxStore.ts` |
| CSS classes | kebab-case or Tailwind utilities |
| State updates | Immutable (spread) — see `lib/utils.ts` |
| File size | ≤ 800 lines; split into focused modules |
| Function size | ≤ 50 lines; extract helpers |
| Errors | Handled explicitly; never silently swallowed |
| Coverage | ≥ 80% |

---

## 🤝 Backend Compatibility

The app expects a compatible NCM backend. Two options:

### Option A — NeteaseCloudMusicApi (original)

```bash
git clone https://github.com/Binaryify/NeteaseCloudMusicApi.git
cd NeteaseCloudMusicApi
npm install
node app.js   # serves on http://localhost:3000
```

### Option B — NeteaseCloudMusicApiEnhanced (fork)

Located at `C:\Users\jay\Desktop\ClaudeWorks\api-enhanced`.

```bash
cd C:/Users/jay/Desktop/ClaudeWorks/api-enhanced
pnpm install
pnpm start    # serves on http://localhost:3000
```

> ⚠️ **Important:** Start the backend **before** running `pnpm dev`. The home page expects the API to be reachable; otherwise API calls will return errors and the Bento grid will use fallback data.

---

## 🐛 Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| `API Error: 500` everywhere | Backend not running | `cd <backend> && pnpm start` |
| Songs play but no lyrics | Some tracks have no LRC | Expected — empty state is shown |
| Audio cuts off mid-track | Network instability | The stream retry logic re-fetches at lower bitrate |
| Theme flashes on reload | LocalStorage hydration | Persisted in `uiStore.theme`; `suppressHydrationWarning` is set on `<html>` |
| `pnpm test` is slow | Vitest first run is cold | Subsequent runs use the cache |

---

## 📜 License

[MIT](./LICENSE) — see the file for full text.

---

## 🙏 Acknowledgments

- [Binaryify/NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi) for the canonical NCM API server.
- [shadcn/ui](https://ui.shadcn.com) for the headless component primitives.
- [lucide-icons](https://lucide.dev) for the icon set.
- [Tailwind CSS](https://tailwindcss.com) and native CSS animation utilities.
- Inspired by the design directions of **Spotify**, **Apple Music**, and **YouTube Music 2026**.

---

<p align="center">
  <sub>Built with care for music lovers.</sub>
</p>
