# Keyboard Shortcuts & Gestures

> Every keyboard shortcut, mouse gesture, and touch interaction in **Kahi Music**.

---

## ⌨️ Global Keyboard Shortcuts

Registered by `useGlobalShortcuts` (mounted once in `app/layout.tsx` via `<GlobalShortcuts />`). The listener is attached to `window` and runs at all times **except**:

- When the user is typing in an `<input>`, `<textarea>`, `<select>`, or any `contenteditable` element.
- When any of `Ctrl` / `Meta` / `Alt` is held.

| Key | Action | Scope |
|-----|--------|-------|
| `Space` (or `Spacebar`) | Toggle play / pause | Global |
| `→` (ArrowRight) | Next track | Global |
| `←` (ArrowLeft) | Previous track | Global |
| `↑` (ArrowUp) | Volume up (+5%) | Global |
| `↓` (ArrowDown) | Volume down (−5%) | Global |
| `M` | Toggle mute | Global |
| `F` | Toggle full-screen player | Global |

### Volume step

`VOLUME_STEP = 0.05` (5%). Clamped to `[0, 1]`. Volume persistence is handled by `playerStore.setVolume()` → `localStorage` (`STORAGE_KEYS.VOLUME`).

### Mute behavior

`M` toggles `playerStore.isMuted`. When muted, the engine volume is set to `0`; when unmuted, the engine volume is restored to the stored `volume` value. `volume === 0` is treated as muted by the UI.

### Play / pause behavior

`Space` calls `setHasUserInteracted()` (so the browser's autoplay policy is satisfied) and then `audioEngine.play()` / `audioEngine.pause()` based on the current state. The same path is used by the `<PlayerBar>` play button and the `<FullScreenPlayer>` central play button.

### Programmatic API

For tests and custom integrations, the same logic is exposed as the pure function `resolveShortcut(key, player, ui, audio)` from `@/hooks/useGlobalShortcuts`. It returns `{ handled: boolean }`.

---

## 🖱️ Mouse & Click Shortcuts

| Surface | Click | Double-click | Right-click |
|---------|-------|--------------|-------------|
| **Song row** (`<SongTable>`) | Hover shows the play icon over the index | Plays the song immediately | Opens `<SongContextMenu>` |
| **Play all button** (top of `<SongTable>`) | Plays the entire list, or calls `onPlayAll` | — | — |
| **Bento card** | Navigates to the linked page (or calls `onClick`) | — | — |
| **Banner** | Navigates to the link | — | — |
| **Lyrics line** (`<LyricsPanel>`) | Seeks to that line's timestamp | — | — |
| **PlayerBar play/pause** | Toggles playback | — | — |
| **PlayerBar progress** | Seeks to the clicked position | — | — |
| **PlayerBar volume** | Sets volume to the clicked position | — | — |
| **Sidebar nav** | Navigates to the page | — | — |
| **Header back/forward** | `router.back()` / `router.forward()` | — | — |
| **Header theme toggle** | Cycles `dark → light → system` | — | — |
| **MiniPlayer** | Opens full-screen player | Toggles play (on the inner button) | — |
| **PlayQueue row** | Jumps to that track | — | — |
| **PlayQueue row ×** | Removes from queue | — | — |
| **Tonearm / Vinyl** | (decorative) | — | — |

---

## 📱 Touch Gestures

### Mobile full-screen player (`<FullScreenPlayer />`)

| Gesture | Action |
|---------|--------|
| Swipe ← | Next track |
| Swipe → | Previous track |
| Swipe ↑ | Dismiss full-screen player |
| Swipe ↓ | Dismiss full-screen player |
| Tap central play button | Toggle play / pause |
| Tap progress bar | Seek to that position |
| Tap lyrics line | Seek to that lyric |

Gestures are handled by `useSwipe` (`@/hooks/useSwipe`) with a default `threshold` of 50px. The hook only fires one direction per touch and is **only active on mobile** (gated by `useIsMobile()`).

### `<MobileNav />` bottom tab bar

- **Tap a tab** → navigate to the corresponding route.
- **Tap the now-playing row at the top** → close the drawer / scroll to top of home (currently a link to `/`).

### Mini player / native behavior

- Standard iOS / Android tap-and-hold to bring up the system media controls (handled by Howler's HTML5 mode).

---

## 🧭 Global Navigation

Routes map roughly to the sidebar / mobile nav entries below. There is no URL-based state for the player (intentionally — playback continues across navigation).

| Path | Description | Sidebar Entry |
|------|-------------|---------------|
| `/` | Home — Greeting, Recent Played, Banner, Bento | 发现音乐 |
| `/leaderboard` | Top lists | 排行榜 |
| `/daily` | Daily recommendations | 每日推荐 |
| `/fm` | Personal FM | 私人FM |
| `/radio` | Radios / DJ programs | 电台 |
| `/my?tab=liked` | Liked songs | 我喜欢的 |
| `/liked` | Liked songs (standalone) | — |
| `/my?tab=recent` | Recent plays | 最近播放 |
| `/cloud` | Cloud disk | 云盘 |
| `/search` | Search + lyric search | (Header search input) |
| `/login` | Phone + captcha login | (User avatar) |
| `/playlist/[id]` | Playlist detail | — |
| `/album/[id]` | Album detail | — |
| `/artist/[id]` | Artist page | — |
| `/user/[uid]` | User profile | (User avatar) |
| `/song/[id]` | Song detail | — |

---

## 🪟 Drawer / Sheet Shortcuts

| Surface | Open | Close |
|---------|------|-------|
| **Play queue** | Click the list icon in `<PlayerBar>`, or `useUIStore.setPlayQueueOpen(true)` | `Esc`, click outside, click the X |
| **Full-screen player** | Tap `<MiniPlayer>`, or press `F` | Tap `ChevronDown`, press `F`, swipe up/down (mobile) |
| **Search** (mobile) | Tap the search input, or `useUIStore.setSearchOpen(true)` | `Esc`, click outside |
| **Login** | Tap "登录" in the sidebar / mobile nav | Click outside, navigate away |

---

## ⌨️ Modifier Combinations

The global shortcuts are **not** fired when `Ctrl` / `Meta` / `Alt` is held. This means browser shortcuts like `Ctrl+R` (reload), `Ctrl+L` (focus address bar), and `Cmd+[` (back) keep working as expected.

`Shift` is not checked, but no current binding uses Shift, so plain shifted keys (e.g. typing "S" with caps lock) do not conflict.

---

## ♿ Accessibility

- All shortcut hooks (`useKeyboardShortcuts`, `useGlobalShortcuts`) short-circuit when an input has focus. The `Esc` key is handled by the dialog / sheet components (Radix-based) automatically.
- Every interactive surface has a focusable element with a visible focus ring (`.focus-visible:ring-2`).
- `prefers-reduced-motion` is respected globally — see `useReducedMotion` and the corresponding `globals.css` rules.
- Tooltips (`<Tooltip>`) surface the keyboard hint when one is available, e.g. on the play button.

---

## 🛠 Custom Shortcuts

If you need a new shortcut, add it to `useGlobalShortcuts` (for app-wide bindings) or use `useKeyboardShortcuts` locally inside a component:

```ts
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

useKeyboardShortcuts({
  shortcuts: [
    { key: 'k', handler: () => openSearch(), description: 'Open search' },
    { key: '/', handler: () => focusInput(), preventDefault: true },
  ],
  debug: true,  // logs activations to the console
})
```

The shortcut system normalizes single-character keys to lowercase, so `K` and `k` bind the same handler.

---

## 🧪 Testing

The global shortcut resolver is split into a pure function (`resolveShortcut`) for unit testing without DOM. The hook (`useGlobalShortcuts`) wires it up to `window`'s `keydown` listener. See `tests/__tests__/hooks/useGlobalShortcuts.test.ts` for reference.

For E2E coverage, the keyboard shortcuts are exercised in `tests/e2e/keyboard-shortcuts.spec.ts`.

---

<p align="center"><sub>Last updated: 2026-06-03</sub></p>
