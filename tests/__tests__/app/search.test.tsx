import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import SearchPage from '@/app/search/page'
import { STORAGE_KEYS } from '@/lib/storage'

const mockRouterPush = vi.fn()
const mockRouterReplace = vi.fn()
let currentSearchParams = new URLSearchParams()

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation')
  return {
    ...actual,
    useRouter: () => ({
      push: mockRouterPush,
      replace: mockRouterReplace,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    }),
    useSearchParams: () => currentSearchParams,
  }
})

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  motion: new Proxy(
    {},
    {
      get: (_target, tag: string) => {
        type MotionProps = React.HTMLAttributes<HTMLElement> & Record<string, unknown>
        const MotionComponent = React.forwardRef<HTMLElement, MotionProps>((props, ref) => {
          const domProps = { ...props } as Record<string, unknown>
          const children = domProps.children as React.ReactNode
          delete domProps.children
          for (const key of ['initial', 'animate', 'exit', 'transition', 'whileTap', 'variants', 'custom']) {
            delete domProps[key]
          }
          return React.createElement(tag, { ...(domProps as React.HTMLAttributes<HTMLElement>), ref }, children)
        })
        MotionComponent.displayName = `MockMotion.${tag}`
        return MotionComponent
      },
    }
  ),
}))

vi.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-shell">{children}</div>
  ),
}))

vi.mock('@/components/search/SearchResults', () => ({
  SearchResults: ({ keywords }: { keywords: string }) => (
    <div data-testid="song-results">songs:{keywords}</div>
  ),
}))

vi.mock('@/components/search/LyricSearchResults', () => ({
  LyricSearchResults: ({ query }: { query: string }) => (
    <div data-testid="lyric-results">lyrics:{query}</div>
  ),
}))

vi.mock('@/components/search/SearchHistory', () => ({
  SearchHistory: ({ onSelect, onClear }: { onSelect: (keyword: string) => void; onClear?: () => void }) => (
    <div data-testid="search-history">
      <button type="button" onClick={() => onSelect('历史词')}>
        历史词
      </button>
      <button type="button" onClick={onClear}>
        清除历史
      </button>
    </div>
  ),
}))

vi.mock('@/components/search/HotSearchTags', () => ({
  HotSearchTags: ({ onSelect }: { onSelect: (keyword: string) => void }) => (
    <button type="button" onClick={() => onSelect('热门词')}>
      热门词
    </button>
  ),
}))

vi.mock('@/components/search/SearchSuggestions', () => ({
  SearchSuggestions: ({ query, onSelect }: { query: string; onSelect: (keyword: string) => void }) => (
    <div data-testid="search-suggestions" data-query={query}>
      <button type="button" onClick={() => onSelect('建议词')}>
        建议词
      </button>
    </div>
  ),
}))

function pushedSearchParams(callIndex = -1) {
  const calls = mockRouterPush.mock.calls
  const target = calls.at(callIndex)?.[0] as string
  const [, queryString = ''] = target.split('?')
  return { target, params: new URLSearchParams(queryString) }
}

describe('SearchPage', () => {
  beforeEach(() => {
    currentSearchParams = new URLSearchParams()
    mockRouterPush.mockReset()
    mockRouterReplace.mockReset()
    window.localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  test('renders the empty search landing state with quick search affordances', () => {
    render(<SearchPage />)

    expect(screen.getByTestId('app-shell')).toBeInTheDocument()
    expect(screen.getByRole('search', { name: '搜索音乐' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: '搜索音乐' })).toHaveValue('')
    expect(screen.getByTestId('search-history')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '热门词' })).toBeInTheDocument()
    expect(screen.queryByTestId('song-results')).not.toBeInTheDocument()
  })

  test('submits a trimmed keyword, stores history, and navigates to search results', () => {
    render(<SearchPage />)

    fireEvent.change(screen.getByRole('textbox', { name: '搜索音乐' }), { target: { value: '  周杰伦  ' } })
    fireEvent.submit(screen.getByRole('search', { name: '搜索音乐' }))

    const { target, params } = pushedSearchParams()
    expect(target.startsWith('/search?')).toBe(true)
    expect(params.get('q')).toBe('周杰伦')
    expect(params.has('type')).toBe(false)
    expect(window.localStorage.getItem(`kahi-web-music:${STORAGE_KEYS.SEARCH_HISTORY}`)).toBe(
      JSON.stringify(['周杰伦'])
    )
  })

  test('ignores whitespace-only submissions and empty typed state', () => {
    render(<SearchPage />)

    fireEvent.change(screen.getByRole('textbox', { name: '搜索音乐' }), { target: { value: '   ' } })
    fireEvent.submit(screen.getByRole('search', { name: '搜索音乐' }))

    expect(mockRouterPush).not.toHaveBeenCalled()
    expect(screen.queryByText('输入关键词开始搜索')).not.toBeInTheDocument()
  })

  test('preserves lyric type when submitting and clearing from lyric search', () => {
    currentSearchParams = new URLSearchParams('q=%20%E6%9C%88%E5%85%89%20&type=lyric')
    render(<SearchPage />)

    const input = screen.getByRole('textbox', { name: '搜索歌词' })
    expect(input).toHaveValue('月光')
    expect(screen.getByTestId('lyric-results')).toHaveTextContent('lyrics:月光')

    fireEvent.change(input, { target: { value: '  星光  ' } })
    fireEvent.submit(screen.getByRole('search', { name: '搜索音乐' }))

    let pushed = pushedSearchParams()
    expect(pushed.params.get('q')).toBe('星光')
    expect(pushed.params.get('type')).toBe('lyric')

    fireEvent.click(screen.getByRole('button', { name: '清空搜索关键词' }))

    pushed = pushedSearchParams()
    expect(pushed.target).toBe('/search?type=lyric')
    expect(screen.getByRole('textbox', { name: '搜索歌词' })).toHaveValue('')
  })

  test('quick selections share the same trimmed navigation path', () => {
    render(<SearchPage />)

    fireEvent.click(screen.getByRole('button', { name: '历史词' }))
    expect(pushedSearchParams().params.get('q')).toBe('历史词')

    fireEvent.click(screen.getByRole('button', { name: '热门词' }))
    expect(pushedSearchParams().params.get('q')).toBe('热门词')

    fireEvent.click(screen.getByRole('button', { name: '建议词' }))
    expect(pushedSearchParams().params.get('q')).toBe('建议词')
  })

  test('switches result type without dropping the current query', () => {
    currentSearchParams = new URLSearchParams('q=jay')
    const { unmount } = render(<SearchPage />)

    fireEvent.click(screen.getByRole('button', { name: '歌词' }))
    expect(pushedSearchParams().params.get('q')).toBe('jay')
    expect(pushedSearchParams().params.get('type')).toBe('lyric')

    unmount()
    currentSearchParams = new URLSearchParams('q=jay&type=lyric')
    render(<SearchPage />)

    fireEvent.click(screen.getByRole('button', { name: '歌曲' }))
    const pushed = pushedSearchParams()
    expect(pushed.params.get('q')).toBe('jay')
    expect(pushed.params.has('type')).toBe(false)
  })
})
