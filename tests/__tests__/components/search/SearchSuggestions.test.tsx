import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { useRef } from 'react'
import { render, fireEvent, waitFor, screen, cleanup } from '@testing-library/react'
import { SearchSuggestions } from '@/components/search/SearchSuggestions'

const { mockUseSWR, mockSearchSuggest } = vi.hoisted(() => ({
  mockUseSWR: vi.fn(),
  mockSearchSuggest: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Mocks (must come before imports that use them)
// ---------------------------------------------------------------------------
vi.mock('@/hooks/useDebouncedValue', () => ({
  useDebouncedValue: (value: string) => value,
}))

vi.mock('swr', () => ({
  default: (_key: unknown, _fetcher: unknown) => mockUseSWR(_key, _fetcher),
}))

vi.mock('@/lib/api', () => ({
  ncmApi: {
    get searchSuggest() {
      return mockSearchSuggest
    },
  },
}))

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('SearchSuggestions', () => {
  const onSelect = vi.fn()
  const suggestData = {
    code: 200,
    result: {
      songs: [
        { id: 1, name: '晴天', artists: [{ id: 101, name: '周杰伦' }] },
      ],
      artists: [{ id: 201, name: '周杰伦' }],
      albums: [{ id: 301, name: '叶惠美', artist: { id: 101, name: '周杰伦' } }],
      playlists: [{ id: 401, name: '周杰伦经典', creator: { nickname: 'user1' } }],
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    onSelect.mockClear()
    mockUseSWR.mockReset()
    mockSearchSuggest.mockReset()
    mockUseSWR.mockReturnValue({
      data: suggestData,
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    })
  })

  afterEach(() => {
    cleanup()
  })

  test('renders suggestion sections for non-empty query', async () => {
    const { container } = render(<SearchSuggestions query="周杰伦" onSelect={onSelect} />)

    await waitFor(
      () => {
        expect(container.innerHTML).toContain('歌曲')
      },
      { timeout: 3000 }
    )

    expect(container.innerHTML).toContain('歌手')
    expect(container.innerHTML).toContain('专辑')
    expect(container.innerHTML).toContain('歌单')
  })

  test('calls onSelect when an option is clicked', async () => {
    const { container } = render(<SearchSuggestions query="周杰伦" onSelect={onSelect} />)

    await waitFor(
      () => {
        expect(container.innerHTML).toContain('晴天')
      },
      { timeout: 3000 }
    )

    const option = container.querySelector('[role="option"]')
    expect(option).toBeTruthy()
    if (option) {
      fireEvent.click(option)
      expect(onSelect).toHaveBeenCalledWith('晴天')
    }
  })

  test('supports keyboard selection from the search input', async () => {
    function Harness() {
      const inputRef = useRef<HTMLInputElement>(null)
      return (
        <>
          <input ref={inputRef} aria-label="search" />
          <SearchSuggestions query="周杰伦" onSelect={onSelect} inputRef={inputRef} />
        </>
      )
    }

    render(<Harness />)

    await screen.findByRole('listbox', { name: '搜索建议' })
    const input = screen.getByRole('textbox', { name: 'search' })

    await waitFor(() => {
      expect(input).toHaveAttribute('aria-controls', 'search-suggestions-listbox')
      expect(input).toHaveAttribute('aria-expanded', 'true')
    })

    fireEvent.keyDown(input, { key: 'ArrowDown' })

    await waitFor(() => {
      expect(input).toHaveAttribute('aria-activedescendant', 'suggestion-0')
    })

    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith('晴天')
  })

  test('closes suggestions with Escape', async () => {
    function Harness() {
      const inputRef = useRef<HTMLInputElement>(null)
      return (
        <>
          <input ref={inputRef} aria-label="search" />
          <SearchSuggestions query="周杰伦" onSelect={onSelect} inputRef={inputRef} />
        </>
      )
    }

    render(<Harness />)

    await screen.findByRole('listbox', { name: '搜索建议' })
    const input = screen.getByRole('textbox', { name: 'search' })

    fireEvent.keyDown(input, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.queryByRole('listbox', { name: '搜索建议' })).not.toBeInTheDocument()
      expect(input).toHaveAttribute('aria-expanded', 'false')
    })
  })
})
