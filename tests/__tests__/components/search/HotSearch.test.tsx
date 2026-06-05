import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'

// Hoisted mock state for SWR responses
const swrState = vi.hoisted(() => ({
  data: undefined as unknown,
  isLoading: false,
  error: undefined as unknown,
}))

vi.mock('swr', () => ({
  default: () => ({
    data: swrState.data,
    error: swrState.error,
    isLoading: swrState.isLoading,
    isValidating: false,
    mutate: vi.fn(),
  }),
  useSWRConfig: () => ({ cache: new Map(), mutate: vi.fn() }),
  mutate: vi.fn(),
}))

import { HotSearch } from '@/components/search/HotSearch'

describe('HotSearch', () => {
  beforeEach(() => {
    cleanup()
    swrState.data = undefined
    swrState.isLoading = false
    swrState.error = undefined
  })
  afterEach(() => cleanup())

  test('renders the loading skeleton when isLoading is true', () => {
    swrState.isLoading = true
    const { container } = render(<HotSearch onSelect={vi.fn()} />)
    // One title skeleton plus ten hot-tag skeletons.
    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(11)
    // Heading is intentionally hidden during loading
    expect(screen.queryByText('热搜榜')).toBeNull()
  })

  test('renders the heading and tag list when data is available', () => {
    swrState.data = {
      data: {
        result: {
          hots: [
            { first: '周杰伦', second: 99999 },
            { first: 'Taylor Swift', second: 88888 },
            { first: '夜曲', second: 77777 },
          ],
        },
      },
    }
    render(<HotSearch onSelect={vi.fn()} />)
    expect(screen.getByText('热搜榜')).toBeInTheDocument()
    expect(screen.getByText('周杰伦')).toBeInTheDocument()
    expect(screen.getByText('Taylor Swift')).toBeInTheDocument()
    expect(screen.getByText('夜曲')).toBeInTheDocument()
  })

  test('returns null when hots is empty', () => {
    swrState.data = { data: { result: { hots: [] } } }
    const { container } = render(<HotSearch onSelect={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  test('returns null when there is no data and not loading', () => {
    swrState.data = undefined
    const { container } = render(<HotSearch onSelect={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  test('clicking a tag calls onSelect with the keyword', () => {
    swrState.data = {
      data: { result: { hots: [{ first: '晴天' }, { first: '稻香' }] } },
    }
    const onSelect = vi.fn()
    render(<HotSearch onSelect={onSelect} />)
    fireEvent.click(screen.getByText('晴天'))
    expect(onSelect).toHaveBeenCalledWith('晴天')
    fireEvent.click(screen.getByText('稻香'))
    expect(onSelect).toHaveBeenCalledWith('稻香')
    expect(onSelect).toHaveBeenCalledTimes(2)
  })

  test('uses fallback empty array when data.data.result.hots is undefined', () => {
    swrState.data = { data: { result: {} } }
    const { container } = render(<HotSearch onSelect={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  test('handles deeply missing data path', () => {
    swrState.data = { data: null }
    const { container } = render(<HotSearch onSelect={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })
})
