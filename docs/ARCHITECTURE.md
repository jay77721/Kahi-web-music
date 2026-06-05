# Architecture

> System design, data flow, state management, and PWA strategy for **Kahi Music**.

---

## 🏛 High-Level Architecture

Kahi Music is a **client-heavy SPA** built on Next.js 16 (App Router). The Next.js server only acts as a thin API proxy and shell — every meaningful interaction happens in the browser, driven by Zustand stores and SWR data.

```
┌──────────────────────────────────────────────────────────────────────┐
│                          Browser (Client)                            │
│                                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  ┌──────────────┐ │
│  │  AppShell   │  │  Pages       │  │  Player    │  │  Components  │ │
│  │  (Sidebar,  │→ │  (Home,      │→ │  (Bar,     │→ │  (Banner,    │ │
│  │   Header,   │  │   Search,    │  │   Mini,    │  │   Bento,     │ │
│  │   Mobile)   │  │   Playlist)  │  │   Full)    │  │   SongTable) │ │
│  └─────────────┘  └──────────────┘  └────────────┘  └──────────────┘ │
│         ↓                ↓                ↓                ↓          │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                   Zustand Stores                              │   │
│  │  playerStore · uiStore · userStore · historyStore             │   │
│  └──────────────────────────────────────────────────────────────┘   │
│         ↓                ↓                ↓                ↓          │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────────┐    │
│  │  SWR        │  │  NcmApiClient│  │  AudioEngine (Howler)    │    │
│  │  Cache      │  │  + memory    │  │  + AnalyserNode (Web Audio)│  │
│  └─────────────┘  └──────────────┘  └──────────────────────────┘    │
│         ↓                ↓                ↓                          │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              Service Worker (PWA)                            │   │
│  │   • HTML/JS/CSS  →  stale-while-revalidate                    │   │
│  │   • Images       →  cache-first                                │   │
│  │   • API GETs     →  network-first (5s timeout)                 │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
                                ↓ HTTPS
┌──────────────────────────────────────────────────────────────────────┐
│                    Next.js Server (Node)                              │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  app/api/[...path]/route.ts                                   │   │
│  │   • Forwards every /api/* request to ${API_URL}               │   │
│  │   • Strips /api/ prefix before forwarding                    │   │
│  │   • Passes request cookies through                           │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  app/api/song/stream/route.ts                                │   │
│  │   • Proxies the audio stream with content-type validation    │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
                                ↓ HTTPS
┌──────────────────────────────────────────────────────────────────────┐
│                  NCM API Backend (NeteaseCloudMusicApi)              │
│  Listening on http://localhost:3000 (configurable via API_URL)       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🔁 Data Flow

### 1. App Bootstrap

```
layout.tsx
  ├─ PageTransitionShell  ← wraps every page
  ├─ PlaybackController   ← global audio engine (always mounted)
  ├─ GlobalShortcuts      ← window-level keyboard handler
  ├─ ServiceWorkerRegistrar ← registers /sw.js on first load
  └─ Toaster              ← notifications
```

### 2. Page Render

A typical page render follows the same pattern:

```
AppShell
  └─ <Page>
        ├─ SWR fetch (banner / personalized / etc.)   ← server state
        │     └─ NcmApiClient.request()
        │           ├─ in-memory cache (5 min TTL)
        │           ├─ pendingRequests dedup
        │           └─ fetch(/api/...)   ← /api proxy → backend
        ├─ Read from Zustand (ui / user / player)      ← client state
        └─ Render BentoGrid / SongTable / etc.
              └─ onClick → playerStore.playSong(song)
                              └─ PlaybackController loads URL → audioEngine.play()
```

### 3. Playback Flow

```
User clicks SongTable row
   │
   ├─ playSong(song)
   │    └─ playerStore.playSong(song)
   │         ├─ push to queue (or move-to-top if already in queue)
   │         └─ persist queue + index to localStorage
   │
   └─ PlaybackController (mounted globally) detects currentTrack change
        ├─ audioEngine.load(streamUrl)
        │     └─ Howler creates new Howl with html5: true
        ├─ audioEngine.onPlay/onPause/onEnd/onError  ← registered once
        ├─ audioEngine.play()
        └─ ncmApi.songLyric(id) → parseLyricResponse → setLyrics()

AudioEngine events → playerStore.setIsPlaying / next
useAudioAnalyser rAF loop → reads frequency bins from Howler.masterGain
SpectrumVisualizer paints 64 bars on canvas
```

### 4. Dynamic Background Color

```
currentTrack.al.picUrl
   ↓
useDominantColor(coverUrl)
   ├─ SWR cache key: "dominant-color:<url>"
   ├─ fetch(url, { mode: 'cors' })
   ├─ createImageBitmap(blob)
   ├─ downsample to 50×50 on OffscreenCanvas
   ├─ bucket pixels to 32 levels per channel
   ├─ 3-cluster k-means
   └─ buildColor(r,g,b)  → { r, g, b, hex, oklch }
   ↓
FullScreenPlayer builds radial-gradient CSS with the OKLCH value
   • color = null → static mesh gradient (fallback)
   • color = ...   → 3 radial gradients tinted with the color
```

---

## 🗄 State Management (Zustand)

Kahi Music uses **four independent Zustand stores**. They are designed to be small, single-purpose, and persist only the slices that matter.

### `playerStore` — playback, queue, mode, lyrics

| Slice | Type | Persisted? |
|-------|------|:----------:|
| `currentTrack: Song \| null` | — | — |
| `isPlaying: boolean` | — | — |
| `currentTime: number` | — | — |
| `duration: number` | — | — |
| `volume: number` | `STORAGE_KEYS.VOLUME` | yes |
| `isMuted: boolean` | — | — |
| `hasUserInteracted: boolean` | — | — |
| `queue: Song[]` | `STORAGE_KEYS.PLAY_QUEUE` | yes |
| `queueIndex: number` | `STORAGE_KEYS.PLAY_INDEX` | yes |
| `playMode: 'sequential' \| 'shuffle' \| 'repeat-one' \| 'repeat-all'` | `STORAGE_KEYS.PLAY_MODE` | yes |
| `lyrics: LyricLine[]` | — | — |
| `currentLyricIndex: number` | — | — |
| `playbackError: string \| null` | — | — |

Key actions: `playSong`, `playQueue`, `next`, `prev`, `seek`, `cyclePlayMode`, `addToQueue`, `setLyrics`.

### `uiStore` — UI shell state

| Slice | Persisted? |
|-------|:----------:|
| `sidebarOpen` (PC) | — |
| `sidebarWidth` | — |
| `fullScreenPlayerOpen` (mobile) | — |
| `playQueueOpen` (drawer) | — |
| `searchOpen` | — |
| `theme: 'dark' \| 'light' \| 'system'` | `STORAGE_KEYS.THEME` |
| `isMobile` | — |

### `userStore` — authentication

| Slice | Persisted? |
|-------|:----------:|
| `isLoggedIn: boolean` | — |
| `profile: UserProfile \| null` | `STORAGE_KEYS.USER_PROFILE` |
| `cookie: string \| null` | `STORAGE_KEYS.USER_COOKIE` |

Actions: `login(phone, captcha)`, `logout`, `restore()`.

### `historyStore` — recent plays

| Slice | Persisted? |
|-------|:----------:|
| `history: { song, time }[]` (max 100) | `STORAGE_KEYS.PLAY_HISTORY` |

### Why four stores, not one?

| Benefit | Detail |
|---------|--------|
| Slice isolation | Player state churns every render; UI state does not. |
| Test surface | Each store can be unit-tested in isolation with `create<State>()` semantics. |
| Persistence granularity | Only the slices that should survive a reload are written to localStorage. |
| SSR safety | Stores lazy-read `STORAGE_KEYS` so a fresh server render does not throw. |

---

## 🔌 API Layer

### `NcmApiClient` (`lib/api.ts`)

A thin REST client with three behaviors layered on top of `fetch`:

1. **In-memory cache** keyed by `${endpoint}:${JSON.stringify(params)}` with a 5-minute TTL. Use `skipCache` to bypass.
2. **Request dedup** via a `pendingRequests` map. Concurrent identical requests share a single in-flight promise.
3. **Exponential-backoff retry**: 2 retries with `500ms * 2^(attempt - 1)`.

Three response patterns are handled transparently:

| Pattern | Shape | Handling |
|---------|-------|----------|
| A | `{ code, data: T }` | `return json.data` |
| B | `{ code, ...T }` (no data wrapper) | `return json` |
| C | nested `data.data.xxx` | caller unwraps |
| D | special: songs, playlist, profile, account | caller unwraps |

> **Why this matters:** the NCM backend returns wildly inconsistent shapes depending on the endpoint. A blanket `return json.data` would have failed on `/banner`, `/search/hot`, etc. The client detects the presence of `data` and returns the appropriate slice.

### `lib/api/song/stream` — Audio Stream Proxy

The playback flow does NOT go through `NcmApiClient`. Instead, the client calls `/api/song/stream?id=X&br=Y` directly, which the Next.js route handler proxies to `${API_URL}/song/url`. This is because:

- The response is an audio stream (not JSON).
- We want a single URL to hand to Howler.
- The proxy can attach custom headers (cookie) without exposing secrets.

---

## 🔊 Audio Architecture

### `AudioEngine` (`lib/audio.ts`)

A singleton wrapping a single `Howl` instance:

```
AudioEngine
  ├─ howl: Howl | null           ← current Howl instance
  ├─ currentUrl: string | null   ← URL of the currently loaded track
  ├─ rAF loop                    ← ticks `onTimeUpdate` during playback
  └─ callbacks: onPlay/onPause/onEnd/onError/onTimeUpdate/onLoad
```

Lifecycle:

1. `load(url)` — destroy any existing Howl, create a new one with `html5: true`.
2. `play()` / `pause()` — proxies to Howler.
3. `seek(time)` — both read & write.
4. `setVolume(vol)` — clamps to `[0, 1]`.
5. `destroy()` — cancels rAF and drops the Howl.

### `useAudioAnalyser` (`hooks/useAudioAnalyser.ts`)

Taps the Web Audio API:

```
Howler.ctx (AudioContext)
  └─ Howler.masterGain (GainNode)
       └─ analyserNode (AnalyserNode, fftSize = 256)
            └─ rAF tick → getByteFrequencyData()
```

The hook returns the `AnalyserNode` and a `frequencyData` buffer. `SpectrumVisualizer` paints the bars; the analyser reference can also be reused for future visualizers.

---

## 🌐 PWA & Offline Strategy

### Manifest

- `public/manifest.json` declares the app name, icons (192 / 512), theme color `#1ed760`, and `display: standalone`.
- `appleWebApp` meta is set in `app/layout.tsx` for iOS standalone mode.

### Service Worker (`public/sw.js`)

Three cache buckets:

| Bucket | Strategy | Use |
|--------|----------|-----|
| `kahi-static-v1` | stale-while-revalidate | HTML, JS, CSS, fonts, navigations |
| `img-cache-v1` | cache-first | images |
| `kahi-api-v1` | network-first (5s timeout) | `/api/*` GETs |

Lifecycle:

- **install** — best-effort precache of `/`, `/offline`, `/manifest.json`. If `addAll` fails, fall back to per-URL `cache.add` so the SW still installs.
- **activate** — delete any cache not in the allow-list; `clients.claim()`.
- **fetch** — dispatch to the right strategy based on `request.destination` and URL shape.
- **message** — `SKIP_WAITING` support for client-triggered updates.

### Registration (`lib/sw-register.ts`)

A pure helper (no React) that:

- Short-circuits on the server (`typeof window === 'undefined'`).
- Short-circuits when `navigator.serviceWorker` is missing.
- Surfaces `onNeedRefresh()` (a new worker is installed and waiting) and `onOfflineReady()` (a worker is active).

Mounted as a side-effect component in `app/layout.tsx` via `<ServiceWorkerRegistrar />`.

### Offline Fallback

- For navigations that miss both cache and network, the SW returns `/offline` (if precached) or a `504 Offline` Response.

---

## 🧪 Test Architecture

| Layer | Tool | Location |
|-------|------|----------|
| Pure utilities (api, audio, lrc, color, format) | Vitest | `tests/__tests__/lib/*` |
| Hooks | Vitest + RTL | `tests/__tests__/hooks/*` |
| Stores | Vitest | `tests/__tests__/stores/*` |
| Components | Vitest + RTL | `tests/__tests__/components/*` |
| E2E | Playwright | `tests/e2e/*.spec.ts` |

Coverage threshold: **80%** across the four v8 dimensions. The threshold is enforced by `vitest.config.ts` and will fail the build if regressed.

---

## ⚙️ Build & Runtime

| Stage | Command | Output |
|-------|---------|--------|
| Dev | `pnpm dev` | `next dev --port 3001` |
| Build | `pnpm build` | `.next/` (server + static) |
| Start | `pnpm start` | `next start` on port 3000 |
| Lint | `pnpm lint` | ESLint over the repo |
| Unit | `pnpm test` | Vitest (CI mode) |
| Coverage | `pnpm test:coverage` | Vitest + v8 |
| E2E | `pnpm test:e2e` | Playwright |

---

## 🔐 Security Notes

- All NCM API secrets (the cookie) live server-side; the browser only sees the proxied `/api/*` routes.
- No secrets are hardcoded. `API_URL` is read from the environment.
- The login flow posts `(phone, captcha)` to `/api/login/cellphone`; the response cookie is stored in localStorage and forwarded on subsequent requests via `credentials: 'include'`.

---

## 🔭 Future Work

- Push notifications (background play / new release).
- HLS / DASH adaptive streaming for FLAC sources.
- `IndexedDB` queue persistence for offline playback.
- Optional WebSocket-driven "now playing" friends feed.

---

<p align="center"><sub>Last updated: 2026-06-05</sub></p>
