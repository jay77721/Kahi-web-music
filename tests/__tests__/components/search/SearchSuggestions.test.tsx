import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { useRef } from 'react'
import { render, fireEvent, waitFor, screen, cleanup } from '@testing-library/react'
import { SearchSuggestions } from '@/components/search/SearchSuggestions'

const { mockUseSWR, mockSearchSuggest, mockUseDebouncedValue } = vi.hoisted(() => ({
  mockUseSWR: vi.fn(),
  mockSearchSuggest: vi.fn(),
  mockUseDebouncedValue: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Mocks (must come before imports that use them)
// ---------------------------------------------------------------------------
vi.mock('@/hooks/useDebouncedValue', () => ({
  useDebouncedValue: (value: string, delay: number) => mockUseDebouncedValue(value, delay),
}))

vi.mock('swr', () => ({
  default: (...args: unknown[]) => mockUseSWR(...args),
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
    mockUseDebouncedValue.mockReset()
    mockUseDebouncedValue.mockImplementation((value: string) => value)
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

  test('uses a null SWR key for whitespace-only queries', () => {
    render(<SearchSuggestions query="   " onSelect={onSelect} />)

    expect(mockUseSWR).toHaveBeenCalledWith(
      null,
      expect.any(Function),
      expect.objectContaining({ revalidateOnFocus: false, keepPreviousData: false })
    )
    expect(screen.queryByRole('listbox', { name: '搜索建议' })).not.toBeInTheDocument()
  })

  test('keeps suggestions idle when disabled', () => {
    render(<SearchSuggestions query="jay" onSelect={onSelect} enabled={false} />)

    expect(mockUseSWR).toHaveBeenCalledWith(
      null,
      expect.any(Function),
      expect.objectContaining({ revalidateOnFocus: false, keepPreviousData: false })
    )
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  test('shows loading instead of stale options while waiting for debounce', () => {
    mockUseDebouncedValue.mockReturnValue('周杰伦')

    render(<SearchSuggestions query="周" onSelect={onSelect} />)

    expect(screen.getByRole('listbox', { name: '搜索建议' })).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('status', { name: '正在加载搜索建议' })).toBeInTheDocument()
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
    expect(screen.queryByText('晴天')).not.toBeInTheDocument()
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
