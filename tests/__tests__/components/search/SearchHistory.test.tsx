import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { SearchHistory } from '@/components/search/SearchHistory'
import { STORAGE_KEYS } from '@/lib/storage'

describe('SearchHistory', () => {
  beforeEach(() => {
    cleanup()
    localStorage.clear()
  })
  afterEach(() => cleanup())

  test('returns null when there is no history', () => {
    const { container } = render(<SearchHistory onSelect={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  test('renders a chip for each stored history entry', () => {
    const history = ['周杰伦', 'Taylor Swift', '夜曲']
    localStorage.setItem(
      `kahi-web-music:${STORAGE_KEYS.SEARCH_HISTORY}`,
      JSON.stringify(history),
    )
    render(<SearchHistory onSelect={vi.fn()} />)
    expect(screen.getByText('搜索历史')).toBeInTheDocument()
    expect(screen.getByText('周杰伦')).toBeInTheDocument()
    expect(screen.getByText('Taylor Swift')).toBeInTheDocument()
    expect(screen.getByText('夜曲')).toBeInTheDocument()
  })

  test('respects maxItems cap', () => {
    const history = Array.from({ length: 20 }, (_, i) => `item-${i}`)
    localStorage.setItem(
      `kahi-web-music:${STORAGE_KEYS.SEARCH_HISTORY}`,
      JSON.stringify(history),
    )
    render(<SearchHistory onSelect={vi.fn()} maxItems={5} />)
    // Only 5 items are rendered as chips
    expect(screen.getByText('item-0')).toBeInTheDocument()
    expect(screen.getByText('item-4')).toBeInTheDocument()
    expect(screen.queryByText('item-5')).toBeNull()
  })

  test('clicking a chip calls onSelect with the item', () => {
    localStorage.setItem(
      `kahi-web-music:${STORAGE_KEYS.SEARCH_HISTORY}`,
      JSON.stringify(['晴天']),
    )
    const onSelect = vi.fn()
    render(<SearchHistory onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button', { name: '搜索 晴天' }))
    expect(onSelect).toHaveBeenCalledWith('晴天')
  })

  test('clicking the clear-all button removes all history and calls onClear', () => {
    localStorage.setItem(
      `kahi-web-music:${STORAGE_KEYS.SEARCH_HISTORY}`,
      JSON.stringify(['a', 'b']),
    )
    const onClear = vi.fn()
    render(<SearchHistory onSelect={vi.fn()} onClear={onClear} />)
    fireEvent.click(screen.getByRole('button', { name: '清除全部搜索历史' }))
    expect(onClear).toHaveBeenCalled()
    expect(localStorage.getItem(`kahi-web-music:${STORAGE_KEYS.SEARCH_HISTORY}`)).toBeNull()
    expect(screen.queryByText('搜索历史')).not.toBeInTheDocument()
  })

  test('removing a single item updates the history list and calls onClear', () => {
    localStorage.setItem(
      `kahi-web-music:${STORAGE_KEYS.SEARCH_HISTORY}`,
      JSON.stringify(['a', 'b', 'c']),
    )
    const onClear = vi.fn()
    render(<SearchHistory onSelect={vi.fn()} onClear={onClear} />)
    const removeBtn = screen.getByRole('button', { name: '删除搜索历史：b' })
    fireEvent.click(removeBtn)
    expect(onClear).toHaveBeenCalled()
    const stored = JSON.parse(
      localStorage.getItem(`kahi-web-music:${STORAGE_KEYS.SEARCH_HISTORY}`) || '[]',
    ) as string[]
    expect(stored).toEqual(['a', 'c'])
    expect(screen.queryByText('b')).not.toBeInTheDocument()
    expect(screen.getByText('a')).toBeInTheDocument()
    expect(screen.getByText('c')).toBeInTheDocument()
  })

  test('removing the last item clears storage entirely', () => {
    localStorage.setItem(
      `kahi-web-music:${STORAGE_KEYS.SEARCH_HISTORY}`,
      JSON.stringify(['only']),
    )
    const onClear = vi.fn()
    render(<SearchHistory onSelect={vi.fn()} onClear={onClear} />)
    fireEvent.click(screen.getByRole('button', { name: '删除搜索历史：only' }))
    expect(onClear).toHaveBeenCalled()
    const stored = localStorage.getItem(`kahi-web-music:${STORAGE_KEYS.SEARCH_HISTORY}`)
    expect(stored).toBeNull()
    expect(screen.queryByText('搜索历史')).not.toBeInTheDocument()
  })

  test('clear-all button click does not bubble up to chip click', () => {
    localStorage.setItem(
      `kahi-web-music:${STORAGE_KEYS.SEARCH_HISTORY}`,
      JSON.stringify(['clicked']),
    )
    const onSelect = vi.fn()
    render(<SearchHistory onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button', { name: '清除全部搜索历史' }))
    expect(onSelect).not.toHaveBeenCalled()
  })

  test('ignores malformed history values from storage', () => {
    localStorage.setItem(
      `kahi-web-music:${STORAGE_KEYS.SEARCH_HISTORY}`,
      JSON.stringify(null),
    )
    const { container } = render(<SearchHistory onSelect={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })
})
