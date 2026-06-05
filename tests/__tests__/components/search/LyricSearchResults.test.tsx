'use client'

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'

// ---------------------------------------------------------------------------
// Mocks (must come before imports that use them)
// ---------------------------------------------------------------------------
const { mockUseSWR, mockSearchLyric, mockPlaySong, mockSearchEmptyState } = vi.hoisted(() => ({
  mockUseSWR: vi.fn(),
  mockSearchLyric: vi.fn(),
  mockPlaySong: vi.fn(),
  mockSearchEmptyState: vi.fn(),
}))

vi.mock('swr', () => ({
  default: (key: unknown, fetcher: unknown) => mockUseSWR(key, fetcher),
}))

vi.mock('@/lib/api', () => ({
  ncmApi: {
    get searchLyric() {
      return mockSearchLyric
    },
  },
}))

vi.mock('@/stores/playerStore', () => ({
  usePlayerStore: (selector: (state: { playSong: () => void }) => unknown) =>
    selector({ playSong: mockPlaySong }),
}))

vi.mock('@/components/search/SearchEmptyState', () => ({
  SearchEmptyState: (props: { query: string; type: string }) => mockSearchEmptyState(props),
}))

vi.mock('@/lib/lrc', () => ({
  parseLRC: (text: string) => {
    if (!text) return []
    return text
      .split('\n')
      .map((line) => line.replace(/^\[\d{1,3}:\d{1,2}(?:\.\d{1,3})?\]/, '').trim())
      .filter(Boolean)
      .map((t) => ({ time: 0, text: t }))
  },
}))

// Now safe to import
import { LyricSearchResults } from '@/components/search/LyricSearchResults'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const SAMPLE_LRC = `[00:00.00]作词：测试
[00:01.00]作曲：测试
[00:02.00]这是一段测试歌词包含关键词月光
[00:10.00]另一行也包含月光这个词
[00:20.00]没有命中词的普通歌词行`

const buildSong = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  name: '月光之歌',
  ar: [{ id: 1, name: '测试艺人' }],
  al: { id: 1, name: '测试专辑', picUrl: '' },
  publishTime: 0,
  noCopyrightRcmd: null,
  mv: 0,
  lyric: SAMPLE_LRC,
  ...overrides,
})

type SwrState = {
  data: unknown
  isLoading: boolean
  error?: unknown
}

const setSwrState = (state: SwrState) => {
  mockUseSWR.mockReturnValue({
    data: state.data,
    isLoading: state.isLoading,
    error: state.error,
    isValidating: false,
    mutate: vi.fn(),
  })
}

beforeEach(() => {
  mockUseSWR.mockReset()
  mockSearchLyric.mockReset()
  mockPlaySong.mockReset()
  mockSearchEmptyState.mockClear()
  mockSearchEmptyState.mockImplementation(({ query, type }) => (
    <div data-testid="search-empty">No results for {query} (type={type})</div>
  ))
  setSwrState({ data: { songs: [], songCount: 0 }, isLoading: false })
})

afterEach(() => {
  cleanup()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('LyricSearchResults', () => {
  // ---- Rendering ----
  describe('rendering', () => {
    test('does not throw on render', () => {
      expect(() => render(<LyricSearchResults query="月光" />)).not.toThrow()
    })

    test('renders result items with song metadata', async () => {
      setSwrState({
        data: { songs: [buildSong()], songCount: 1 },
        isLoading: false,
      })

      render(<LyricSearchResults query="月光" />)

      await waitFor(() => {
        expect(screen.getByText('测试艺人')).toBeInTheDocument()
      })
      expect(screen.getByText('测试专辑')).toBeInTheDocument()
    })

    test('does not fetch when query is empty (SWR key is null)', () => {
      render(<LyricSearchResults query="" />)
      // The component should pass `null` to useSWR when query is empty
      const calls = mockUseSWR.mock.calls
      const lastCall = calls[calls.length - 1]
      expect(lastCall[0]).toBeNull()
    })

    test('passes the query as the SWR key when provided', () => {
      render(<LyricSearchResults query="moonlight" />)
      const calls = mockUseSWR.mock.calls
      const lastCall = calls[calls.length - 1]
      expect(lastCall[0]).toBe('lyric-search:moonlight')
    })
  })

  // ---- Highlighting ----
  describe('highlighting', () => {
    test('wraps matched substring in <mark> elements', () => {
      setSwrState({
        data: { songs: [buildSong({ name: '月光之歌' })], songCount: 1 },
        isLoading: false,
      })

      render(<LyricSearchResults query="月光" />)

      const marks = document.querySelectorAll('mark')
      expect(marks.length).toBeGreaterThan(0)
      const combined = Array.from(marks)
        .map((m) => m.textContent)
        .join('')
      expect(combined).toContain('月光')
    })

    test('highlights match in album name', () => {
      setSwrState({
        data: {
          songs: [buildSong({ al: { id: 1, name: '月光专辑', picUrl: '' } })],
          songCount: 1,
        },
        isLoading: false,
      })

      render(<LyricSearchResults query="月光" />)

      const marks = document.querySelectorAll('mark')
      const albumText = Array.from(marks)
        .map((m) => m.textContent)
        .join('')
      expect(albumText).toContain('月光')
    })
  })

  // ---- Lyric fragments ----
  describe('lyric fragments', () => {
    test('shows only lines that contain the query', () => {
      setSwrState({
        data: { songs: [buildSong()], songCount: 1 },
        isLoading: false,
      })

      render(<LyricSearchResults query="月光" />)

      expect(screen.queryByText('没有命中词的普通歌词行')).not.toBeInTheDocument()
    })

    test('clips long lyrics around the match (with ellipsis)', () => {
      const longLine = 'a'.repeat(200) + '月光' + 'b'.repeat(200)
      const lrc = `[00:00.00]${longLine}`
      setSwrState({
        data: { songs: [buildSong({ lyric: lrc })], songCount: 1 },
        isLoading: false,
      })

      render(<LyricSearchResults query="月光" />)

      // The rendered line should include ellipsis (clipping)
      const container = document.body.textContent ?? ''
      expect(container).toMatch(/…/)
    })
  })

  // ---- Empty state ----
  describe('empty state', () => {
    test('shows empty state when no songs returned', () => {
      setSwrState({
        data: { songs: [], songCount: 0 },
        isLoading: false,
      })

      render(<LyricSearchResults query="不存在的关键词" />)

      expect(screen.getByTestId('search-empty')).toBeInTheDocument()
      expect(mockSearchEmptyState).toHaveBeenCalledWith(
        expect.objectContaining({ query: '不存在的关键词', type: 'lyrics' })
      )
    })

    test('shows empty state when result is undefined', () => {
      setSwrState({ data: undefined, isLoading: false })

      render(<LyricSearchResults query="anything" />)

      expect(screen.getByTestId('search-empty')).toBeInTheDocument()
    })

    test('shows a lyric fragment fallback when returned lyrics do not contain the query', () => {
      setSwrState({
        data: {
          songs: [buildSong({ lyric: '[00:00.00]完全不同的歌词行' })],
          songCount: 1,
        },
        isLoading: false,
      })

      render(<LyricSearchResults query="月光" />)

      expect(screen.getByText('未找到匹配的歌词片段')).toBeInTheDocument()
      expect(screen.queryByText('完全不同的歌词行')).not.toBeInTheDocument()
    })
  })

  // ---- Playback ----
  describe('playback', () => {
    test('clicking the play button calls playSong', () => {
      setSwrState({
        data: { songs: [buildSong()], songCount: 1 },
        isLoading: false,
      })

      render(<LyricSearchResults query="月光" />)

      const playBtn = screen.getByRole('button', { name: /播放 月光之歌/ })
      playBtn.click()

      expect(mockPlaySong).toHaveBeenCalledTimes(1)
      const passedSong = mockPlaySong.mock.calls[0][0]
      expect(passedSong.id).toBe(1)
      expect(passedSong.name).toBe('月光之歌')
    })
  })

  // ---- Loading ----
  describe('loading', () => {
    test('shows skeleton while loading and no data', () => {
      setSwrState({ data: undefined, isLoading: true })

      const { container } = render(<LyricSearchResults query="moon" />)

      // Skeletons use animate-pulse class (Tailwind v4 default for Skeleton)
      const skeletons = container.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
      expect(screen.getByRole('status', { name: '正在加载歌词搜索结果' })).toBeInTheDocument()
      expect(screen.queryByTestId('search-empty')).not.toBeInTheDocument()
    })
  })
})
