import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { HotSearchTags } from '@/components/search/HotSearchTags'

describe('HotSearchTags', () => {
  beforeEach(() => cleanup())
  afterEach(() => cleanup())

  test('renders the heading', () => {
    render(<HotSearchTags onSelect={vi.fn()} />)
    expect(screen.getByText('热门搜索')).toBeInTheDocument()
  })

  test('renders a button for every tag in the static list', () => {
    render(<HotSearchTags onSelect={vi.fn()} />)
    const expected = ['周杰伦', 'Taylor Swift', '夜曲', '晴天', '稻香', '告白气球', '七里香', '起风了', 'Mojito', 'Shape of You']
    for (const tag of expected) {
      expect(screen.getByRole('button', { name: tag })).toBeInTheDocument()
    }
  })

  test('exposes hot tags as a semantic list', () => {
    render(<HotSearchTags onSelect={vi.fn()} />)
    expect(screen.getByRole('list', { name: '热门搜索关键词' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(10)
  })

  test('clicking a tag calls onSelect with that tag', () => {
    const onSelect = vi.fn()
    render(<HotSearchTags onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button', { name: '晴天' }))
    expect(onSelect).toHaveBeenCalledWith('晴天')
  })

  test('renders 10 buttons total', () => {
    render(<HotSearchTags onSelect={vi.fn()} />)
    // All buttons are tag buttons. The list has exactly 10 tags.
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBe(10)
  })
})
