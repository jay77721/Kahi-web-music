import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { SearchEmptyState } from '@/components/search/SearchEmptyState'

describe('SearchEmptyState', () => {
  beforeEach(() => cleanup())
  afterEach(() => cleanup())

  test('renders the search icon and default text', () => {
    render(<SearchEmptyState query="周杰伦" />)
    expect(screen.getByText('周杰伦')).toBeInTheDocument()
  })

  test('uses "内容" by default for the type label', () => {
    render(<SearchEmptyState query="x" />)
    expect(screen.getByText(/未找到相关内容/)).toBeInTheDocument()
    // The query text is wrapped in a <span> so we look it up by element
    const span = screen.getByText('x')
    expect(span.tagName).toBe('SPAN')
  })

  test('localizes the type label for each type', () => {
    const cases: Array<['all' | 'songs' | 'artists' | 'albums' | 'playlists' | 'mvs' | 'lyrics', string]> = [
      ['songs', '歌曲'],
      ['artists', '歌手'],
      ['albums', '专辑'],
      ['playlists', '歌单'],
      ['mvs', 'MV'],
      ['lyrics', '歌词'],
    ]
    for (const [type, expected] of cases) {
      cleanup()
      render(<SearchEmptyState query="q" type={type} />)
      expect(screen.getByText(`未找到相关${expected}`)).toBeInTheDocument()
    }
  })

  test('escapes the query in the message body', () => {
    render(<SearchEmptyState query="special&<>chars" />)
    expect(screen.getByText(/special&<>chars/)).toBeInTheDocument()
  })
})
