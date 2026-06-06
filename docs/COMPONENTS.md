# Component Reference

> Every component in **Kahi Music**, grouped by domain, with a short description and key props.

> 💡 **Tip:** Most components read from Zustand stores directly. They accept only the props that change per usage. See [ARCHITECTURE.md](./ARCHITECTURE.md) for the state shape.

---

## 🎵 `components/player/` — Playback Surfaces

### `<PlaybackController />`

| Prop | Type | Notes |
|------|------|-------|
| — | — | Renders `null`. Side-effect component mounted once in `app/layout.tsx`. |

- Bridges `playerStore` ↔ `AudioEngine` (Howler).
- Loads the stream URL whenever `currentTrack.id` changes.
- Fetches and parses LRC lyrics.
- Exposes a global `window.__playbackCtrl` API (`togglePlay`, `next`, `prev`, `playTrack`, `getState`) for legacy callers.

### `<PlayerBar />`

| Prop | Type | Notes |
|------|------|-------|
| — | — | Reads everything from stores. |

- Fixed bottom bar, **desktop only** (returns `null` on mobile).
- Sections: track info · transport + progress · volume + queue toggle.
- Highlights progress with `progress-glow` while playing.

### `<MiniPlayer />`

| Prop | Type | Notes |
|------|------|-------|
| — | — | Reads everything from stores. |

- Fixed bottom bar, **mobile only** (returns `null` on desktop).
- Tapping anywhere opens the `<FullScreenPlayer>`.

### `<FullScreenPlayer />`

| Prop | Type | Notes |
|------|------|-------|
| — | — | Reads everything from stores. |

- Premium full-screen surface with **vinyl record + tonearm + spectrum visualizer + glassmorphism lyrics**.
- Background extracted from cover art via `useDominantColor`.
- Mobile-only swipe gestures: `←/→` switch tracks, `↑/↓` dismiss.
- Honors `prefers-reduced-motion` for all entrance + decorative motion.

### `<LyricsPanel />`

| Prop | Type | Notes |
|------|------|-------|
| `lyrics` | `LyricLine[]` | Required. From `playerStore.lyrics`. |
| `currentTime` | `number` | Required. Seconds. |
| `onSeek?` | `(time: number) => void` | Called when a line is clicked or activated by keyboard. |

- Frosted-glass surface; active line gets a brighter treatment + glow.
- Auto-scrolls the active line into view (smooth vs instant based on motion preference).
- Translation lines (if present) sit below in a softer tone.

### `<VinylDisc />`

| Prop | Type | Notes |
|------|------|-------|
| `coverUrl` | `string` | Required. |
| `isPlaying` | `boolean` | Required. |
| `size?` | `number` | Pixel size. Default `280`. |
| `className?` | `string` | Forwarded. |

- Decorative (`aria-hidden`). Spin delegated to CSS `vinyl-spin` keyframes.
- Pauses in place via `animation-play-state: paused` rather than resetting the transform.

### `<Tonearm />`

| Prop | Type | Notes |
|------|------|-------|
| `isPlaying` | `boolean` | Required. |
| `className?` | `string` | Forwarded. |

- SVG tonearm that rotates from 0° → 25° via CSS transition.
- Decorative (`aria-hidden`).

### `<SpectrumVisualizer />`

| Prop | Type | Notes |
|------|------|-------|
| `analyser` | `AnalyserNode \| null` | From `useAudioAnalyser`. |
| `isPlaying` | `boolean` | Required. |
| `barCount?` | `number` | Default `64`. |
| `color?` | `string` | Defaults to `var(--accent)`. |
| `className?` | `string` | Forwarded. |

- Canvas-based 64-bar FFT visualizer; it reads the analyser itself, so callers that only need the visualizer can pass `collectFrequencyData: false` to `useAudioAnalyser`.
- When `isPlaying` is false, frames decay exponentially to a flat line.

### `<PlayQueue />`

| Prop | Type | Notes |
|------|------|-------|
| — | — | Reads from `playerStore` + `uiStore`. |

- Sheet (right-side drawer) listing the current play queue.
- Each row: index · title/artist · duration · remove.
- Empty state: "播放列表为空".

---

## 🧩 `components/common/` — Shared Building Blocks

### `<SongTable />`

| Prop | Type | Notes |
|------|------|-------|
| `songs` | `Song[]` | Required. |
| `showIndex?` | `boolean` | Default `true`. |
| `showAlbum?` | `boolean` | Default `true`. |
| `showActions?` | `boolean` | Default `true`. |
| `isLoading?` | `boolean` | Default `false`. Renders skeletons when `true`. |
| `animated?` | `boolean` | Default `true`. Stagger entrance animation. |
| `selectable?` | `boolean` | Default `false`. Enables tri-state checkboxes. |
| `selectedIds?` | `ReadonlySet<string>` | Current selection. |
| `onToggleSelect?` | `(id: string) => void` | Row toggle. |
| `onToggleSelectAll?` | `(ids: string[]) => void` | Header toggle. |
| `onClearSelection?` | `() => void` | Clear-all. |
| `onPlayAll?` | `() => void` | Overrides default `playQueue(songs, 0)`. |
| `className?` | `string` | Forwarded. |

- Reusable song list with hover-reveal album art, playing indicator, row context menu, and batch selection.

### `<BatchActionBar />`

| Prop | Type | Notes |
|------|------|-------|
| `selectedCount` | `number` | Required. Drives visibility. |
| `onClear` | `() => void` | Required. Clear-selection handler. |
| `actions` | `ReadonlyArray<{ label, onClick, icon?, danger?, disabled? }>` | Required. |
| `className?` | `string` | Forwarded. |
| `animated?` | `boolean` | Default `true`. Spring entrance. |

- Sticky glass-panel toolbar. Slides up when `selectedCount > 0`. Honors `prefers-reduced-motion`.

### `<BlurImage />`

| Prop | Type | Notes |
|------|------|-------|
| `alt` | `string` | **Required** (a11y). |
| `className?` | `string` | Forwarded. |
| `style?` | `CSSProperties` | Forwarded. |
| `loading?` | `'lazy' \| 'eager'` | Default `'lazy'`. Auto-cleared when `priority` is set. |
| `priority?` | `boolean` | Sets eager loading. |
| `onLoad?` | `(event) => void` | Wrapped to also flip internal `isLoaded`. |
| *+ all `next/image` props* | — | `src`, `width`, `height`, `sizes`, `fill`, … |

- Wraps `next/image` with a 1×1 base64 SVG blur placeholder and a 200 ms fade-in.

### `<PlaylistCard />`

| Prop | Type | Notes |
|------|------|-------|
| `id` | `number` | Required. Used in `/playlist/{id}` href. |
| `name` | `string` | Required. |
| `coverUrl` | `string` | Required. |
| `playCount?` | `number` | Renders badge if `> 0`. |
| `className?` | `string` | Forwarded. |

- Hover-lift card with cover, play badge, and play count.

### `<SkeletonLoader />`

| Prop | Type | Notes |
|------|------|-------|
| `count?` | `number` | Default `3`. |
| `width?` | `string` | Tailwind class. Default `'w-full'`. |
| `height?` | `string` | Tailwind class. Default `'h-4'`. |
| `circle?` | `boolean` | Default `false`. Renders `rounded-full`. |
| `className?` | `string` | Forwarded. |
| `gap?` | `string` | Tailwind class for vertical gap when `count > 1`. Default `'gap-3'`. |

- Shimmer skeleton rows/avatars for loading states.

### `<PlayingIndicator />`

| Prop | Type | Notes |
|------|------|-------|
| `isPlaying` | `boolean` | Required. |
| `size?` | `'sm' \| 'md'` | Default `'sm'`. |
| `className?` | `string` | Forwarded. |

- Three-bar equalizer that animates while playing (`aria-hidden`).

### `<SongContextMenu />`

| Prop | Type | Notes |
|------|------|-------|
| `children` | `ReactNode` | Required. Wrapper around the table. |

- Listens for `contextmenu` events on rows with `data-song-id` and pops a song-aware menu (play, add to queue, like, navigate to album/artist, copy name).

### `<GlobalShortcuts />`

- Renders `null`. Mounts `useGlobalShortcuts` in the root layout.
- See [SHORTCUTS.md](./SHORTCUTS.md).

### `<ServiceWorkerRegistrar />`

- Renders `null`. Mounts the service worker and offers a Sonner toast when a new version is available.

### `<PageTransition />` / `<PageTransitionRoute />`

- Internal transition primitives; the route-aware shell (`<PageTransitionShell>`) is in `components/layout/`.

### Transition utilities — `DrawerTransition`, `ModalTransition`, `ListTransition`, `GridTransition`

- CSS-only enter transition helpers used to unify drawers, modals, lists, and grids.

### `<SelectionCheckbox />`

| Prop | Type | Notes |
|------|------|-------|
| `state` | `'none' \| 'partial' \| 'all'` | Required. |
| `onChange` | `() => void` | Required. |
| `aria-label?` | `string` | A11y label. |

### `<Tag />`

- Pill-style tag with optional `gradient-border` hover animation.

---

## 🏠 `components/layout/` — Shell

### `<AppShell>`

| Prop | Type | Notes |
|------|------|-------|
| `children` | `ReactNode` | Required. |

- Top-level layout: `<Sidebar />` (desktop) + `<Header />` + `<main>` + `<MobileNav />` (mobile).
- Reads `useIsMobile()` to switch shell pieces and reports it back to `uiStore.isMobile`.

### `<Sidebar />`

- Two modes: expanded (`w-[280px]`) and collapsed (`w-[76px]`).
- Main nav (发现音乐, 排行榜, 每日推荐, 私人FM, 电台) · My nav (我喜欢的, 最近播放, 云盘) · user link.
- Active item uses CSS background/indicator states for lightweight navigation feedback.

### `<Header />`

- Sticky top header.
- Mobile: hamburger + search input.
- Desktop: back/forward arrows + global search input + theme toggle + user avatar.
- Theme: `dark` (default) / `light` / `system`, persisted via `uiStore`.

### `<MobileNav />`

- Bottom tab bar, mobile-only.
- Top row: now-playing indicator (when a track is active) linking back home.
- Tabs: 首页, 搜索, 我的, 云盘, 电台, 登录.

### `<PageTransitionShell>`

| Prop | Type | Notes |
|------|------|-------|
| `children` | `ReactNode` | Required. |

- Triggers fade + slide when `pathname` changes.
- Lives in `app/layout.tsx`.

---

## 🎨 `components/discover/` — Home & Discovery

### `<Banner />`

- Carousel of NCM banners (5-second auto-advance).
- Manual arrows. Skeleton while loading.

### `<BentoGrid />`

- 12-column mosaic of:
  - 1× large (4×2) — 私人雷达
  - 2× medium (4×1) — 热门歌单
  - 1× large (4×2) — 新歌速递
  - 4× small (3×1) — 艺人推荐
- Stagger entrance via CSS utilities.
- SWR-cached data, with built-in fallbacks when the API is slow.

### `<BentoCard />`

| Prop | Type | Notes |
|------|------|-------|
| `title` | `string` | Required. |
| `subtitle?` | `string` | Optional. |
| `cover?` | `string` | Optional image URL. |
| `icon?` | `LucideIcon` | Optional. Rendered in the top-left badge. |
| `size` | `'sm' \| 'md' \| 'lg'` | Required. Drives grid placement. |
| `badge?` | `string` | Optional top-right pill. |
| `accent?` | `string` | CSS color. Default `var(--accent)`. |
| `className?` | `string` | Forwarded. |
| `children?` | `ReactNode` | Slot for extra content. |
| **Either** `href` (link variant) **or** `onClick` (button variant) | | Mutually exclusive. |

- Renders as an anchor when `href` is given, otherwise a button.

### Home composition

- The home page renders `<RecentPlayed />`, `<Banner />`, and lazy-loaded `<BentoGrid />` in sequence.
- `<BentoGrid />` owns the API-backed discover tiles; `<Banner />` owns the carousel; `<RecentPlayed />` reads local playback history.

### `<RecentPlayed />`

| Prop | Type | Notes |
|------|------|-------|
| `maxItems?` | `number` | Default `12`. |

- Pulls from `historyStore`. Empty state when history is empty.
- Responsive 2/3/4/6-column cover grid. Click to play.

---

## 📜 `components/playlist/` — Playlist & Album Detail

### `<HeroBanner />`

| Prop | Type | Notes |
|------|------|-------|
| `cover` | `string` | Required. |
| `title` | `string` | Required. |
| `subtitle?` | `string` | Optional. |
| `meta?` | `{ plays?, count?, creator? }` | Optional. Renders as a horizontal meta row. |
| `badge?` | `string` | Optional pill in the top-right. |
| `actions?` | `ReactNode` | Slot for action buttons. |
| `className?` | `string` | Forwarded. |

- Cover-color-tinted gradient background (extracted via `useDominantColor`).
- Easing `cubic-bezier(0.16, 1, 0.3, 1)`.

### `<MetadataBento />`

| Prop | Type | Notes |
|------|------|-------|
| `items` | `ReadonlyArray<{ icon, label, value, size?, color? }>` | Required. |
| `className?` | `string` | Forwarded. |

- 12-column grid of stat tiles (`sm` / `md` / `lg`).
- Stagger entrance; subtle hover scale.

---

## 🔎 `components/search/` — Search Surfaces

### `<HotSearch />`

- Renders the NCM hot-search list with click-to-search behavior.

### `<SearchResults />`

- Tabbed results: songs · artists · albums · playlists · MVs.

### `<LyricSearchResults />`

- Renders matches for `cloudsearch` with `type=1006` (lyric text search).
- Click a result to start playback at the song.

### `<SearchHistory />`

- List of recent search terms, persisted in localStorage.
- Per-item delete + clear-all.

### `<SearchEmptyState />`

- Friendly empty state shown before any query.

---

## 👤 `components/user/`

### `<ProfileHeader />`

- Avatar, nickname, signature, follow button, edit profile.
- Driven by `userStore.profile`.

---

## 💬 `components/comment/`

### `<CommentList />`

- Paginated comment thread. Sorts: hot / new.
- Like, reply, copy.

---

## 🧱 `components/ui/` — shadcn/ui Primitives

Local thin wrappers over `@base-ui/react`, styled with Tailwind. Each follows the standard shadcn API.

| Component | Purpose |
|-----------|---------|
| `avatar` | Round user avatar with fallback initials. |
| `badge` | Small pill. |
| `button` | Variants: `default`, `ghost`, `outline`, `destructive`, `link`, `accent`. |
| `context-menu` | Right-click menu shell. |
| `dialog` | Modal. |
| `dropdown-menu` | Dropdown. |
| `input` | Text input. |
| `scroll-area` | Custom scrollbar. |
| `separator` | Horizontal/vertical rule. |
| `sheet` | Side drawer. |
| `skeleton` | Loading placeholder. |
| `slider` | Range input. |
| `sonner` | Toast wrapper. |
| `tabs` | Tab bar. |
| `tooltip` | Tooltip. |

---

## 📊 Quick Lookup — Common Patterns

| Need | Component |
|------|-----------|
| Render a list of songs | `<SongTable songs={...} />` |
| Show play / pause / seek / volume | `<PlayerBar />` (desktop), `<MiniPlayer />` (mobile) |
| Premium full-screen experience | `<FullScreenPlayer />` |
| Glass lyrics | `<LyricsPanel />` |
| 12-col mosaic card | `<BentoCard />` (single) / `<BentoGrid />` (prebuilt layout) |
| Cover-tinted hero | `<HeroBanner />` |
| Drag-and-drop multi-select | `<SongTable selectable />` + `<BatchActionBar />` |
| Loading state | `<SkeletonLoader />` or `<Skeleton />` |
| Lazy image with blur | `<BlurImage />` |
| Right-click menu on a row | `<SongContextMenu>` (wraps any container) |
| Show toast | `toast('Hi', { description: '...' })` from `sonner` |
| Subscribe to keyboard | `useKeyboardShortcuts({ shortcuts: [...] })` |

---

<p align="center"><sub>Last updated: 2026-06-05</sub></p>
