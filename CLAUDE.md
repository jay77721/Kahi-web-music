# KaQi Music

> Web-based music player built on Next.js, interfacing with the NetEase Cloud Music (NCM) API.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict) |
| UI | React 19 + Tailwind CSS v4 + shadcn/ui |
| State | Zustand 5 |
| Audio | Howler.js 2.2 |
| Animation | Framer Motion |
| Data Fetching | SWR |
| Testing | Vitest (unit) + Playwright (E2E) |
| Package Manager | pnpm |

## Commands

```bash
pnpm dev          # Start dev server (port 3000)
pnpm build        # Production build
pnpm start        # Run production server
pnpm lint         # ESLint
pnpm test         # Vitest (watch mode)
pnpm test:run     # Vitest (CI mode)
pnpm test:e2e     # Playwright
```

## Project Structure

```
app/                    # Next.js App Router pages (all client-heavy)
├── api/[...path]/      # API proxy → backend (API_URL env)
├── layout.tsx          # Root layout: PlaybackController + Toaster
└── page.tsx            # Home page

components/
├── common/             # Shared UI (skeleton, transitions, song table)
├── discover/           # Banner, recommendations, rankings
├── layout/             # AppShell, Header, Sidebar, MobileNav
├── player/             # PlayerBar, MiniPlayer, FullScreenPlayer, queue
├── search/             # HotSearch, SearchResults
└── ui/                 # shadcn/ui primitives

hooks/                  # Custom hooks (drag, swipe, keyboard, scroll)
lib/
├── api.ts              # NcmApiClient (REST client, caching, retry)
├── audio.ts            # AudioEngine (Howler.js singleton)
├── lrc.ts              # Lyrics parser
├── format.ts           # Date/time formatting
└── storage.ts          # Typed localStorage wrapper
stores/                 # Zustand stores
├── playerStore.ts      # Playback, queue, play mode, lyrics
├── uiStore.ts          # Sidebar, theme, drawers, mobile nav
└── userStore.ts        # Auth, profile, cookie
types/                  # TypeScript domain types
tests/                  # Vitest + Playwright
```

## Architecture Notes

- **Client-heavy SPA**: Most pages use `'use client'` and consume Zustand stores.
- **API Proxy**: All NCM API calls go through `app/api/[...path]/route.ts`, which forwards to the backend defined by `API_URL`. This handles cookie forwarding and CORS.
- **Audio Singleton**: `AudioEngine` in `lib/audio.ts` is a singleton wrapping Howler.js. The `PlaybackController` component in the root layout initializes it.
- **State**: Zustand stores for playback, UI, and user/auth. No URL-based state management currently.
- **Styling**: Tailwind v4 with PostCSS. Custom CSS in `app/globals.css` and `styles/`. Design tokens via CSS variables.
- **Theme**: Dark theme with green accent (`#1ed760`), Spotify-inspired.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `API_URL` | Backend NCM API server URL (server-side only) | Yes |

See `.env.example` for the template.

## Backend API

The project requires a compatible NCM backend server. Two options:

1. **NeteaseCloudMusicApi** (original): `git clone https://github.com/Binaryify/NeteaseCloudMusicApi.git`
2. **NeteaseCloudMusicApiEnhanced** (enhanced fork): Located at `C:\Users\jay\Desktop\ClaudeWorks\api-enhanced`
   - Run: `cd C:\Users\jay\Desktop\ClaudeWorks\api-enhanced && pnpm start`
   - Default: `http://localhost:3000`

## Code Conventions

- **Language**: TypeScript strict mode, ES2017 target.
- **Path alias**: `@/*` maps to the project root.
- **Components**: PascalCase files. Client components marked with `'use client'`.
- **Hooks**: `use` prefix (e.g., `useDrag`, `useKeyboardShortcuts`).
- **Stores**: `storeNameStore.ts` pattern (e.g., `playerStore.ts`).
- **CSS classes**: kebab-case or Tailwind utilities.
- **Immutability**: Prefer immutable updates (see `~/.claude/rules/ecc/common/coding-style.md`).
- **File size**: Keep files under 800 lines; split into focused modules.
- **Function size**: Keep functions under 50 lines; extract helpers.
- **Error handling**: Handle explicitly at every level; never silently swallow.

## Testing

- **Unit tests**: Vitest with jsdom, 80% coverage threshold enforced.
- **E2E tests**: Playwright (Chromium), key flows: home load, navigation, player.
- **Test location**: `tests/__tests__/` for unit, `tests/e2e/` for E2E.

## Key Dependencies

- **NCM API compatibility**: Requires a compatible backend (e.g., [Binaryify/NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi)).
- **No hardcoded secrets**: All configuration via environment variables.
