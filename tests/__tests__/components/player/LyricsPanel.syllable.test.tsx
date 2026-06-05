import { describe, test, expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { render, screen } from '@/tests/helpers/test-utils'
import { LyricsPanel } from '@/components/player/LyricsPanel'
import type { LyricLine } from '@/types'

const syllableLyrics: LyricLine[] = [
  {
    time: 0,
    text: '你好世界',
    syllables: [
      { text: '你', time: 0, duration: 0.5 },
      { text: '好', time: 0.5, duration: 0.5 },
      { text: '世', time: 1.0, duration: 0.5 },
      { text: '界', time: 1.5, duration: 0.5 },
    ],
  },
  {
    time: 5,
    text: '再见',
    translation: 'Goodbye',
    syllables: [
      { text: '再', time: 5, duration: 0.5 },
      { text: '见', time: 5.5, duration: 0.5 },
    ],
  },
  {
    time: 10,
    text: 'Plain line',
  },
]

describe('LyricsPanel — syllable rendering', () => {
  afterEach(() => {
    cleanup()
  })

  test('renders each syllable inside the active line', () => {
    render(<LyricsPanel lyrics={syllableLyrics} currentTime={0.25} />)
    const container = screen.getAllByTestId('lyric-syllables')[0]
    expect(container).toBeInTheDocument()
    const syllables = container.querySelectorAll('.lyric-syllable')
    expect(syllables).toHaveLength(4)
    expect(syllables[0]?.textContent).toBe('你')
    expect(syllables[1]?.textContent).toBe('好')
    expect(syllables[2]?.textContent).toBe('世')
    expect(syllables[3]?.textContent).toBe('界')
  })

  test('marks syllables as spoken when the playhead has crossed them', () => {
    render(<LyricsPanel lyrics={syllableLyrics} currentTime={1.2} />)
    const container = screen.getAllByTestId('lyric-syllables')[0]
    const syllables = container.querySelectorAll('.lyric-syllable')
    expect(syllables[0]?.getAttribute('data-spoken')).toBe('true')
    expect(syllables[1]?.getAttribute('data-spoken')).toBe('true')
    expect(syllables[2]?.getAttribute('data-spoken')).toBe('true')
    expect(syllables[3]?.getAttribute('data-spoken')).toBe('false')
  })

  test('all syllables are un-spoken just before the line starts', () => {
    // currentTime is just before the line stamp, so no syllable is yet spoken.
    render(<LyricsPanel lyrics={syllableLyrics} currentTime={-0.5} />)
    // The first line is not yet active; no syllable spans should render.
    const containers = screen.queryAllByTestId('lyric-syllables')
    expect(containers).toHaveLength(0)
  })

  test('all syllables are spoken once the playhead crosses the final one', () => {
    render(<LyricsPanel lyrics={syllableLyrics} currentTime={2.0} />)
    const container = screen.getAllByTestId('lyric-syllables')[0]
    const syllables = container.querySelectorAll('.lyric-syllable')
    syllables.forEach((syl) => {
      expect(syl.getAttribute('data-spoken')).toBe('true')
    })
  })

  test('does not render the syllable container for inactive lines', () => {
    render(<LyricsPanel lyrics={syllableLyrics} currentTime={0.25} />)
    // Only the first line is active; the second and third should not render
    // syllable spans.
    const containers = screen.queryAllByTestId('lyric-syllables')
    expect(containers).toHaveLength(1)
  })

  test('falls back to plain text for lines without syllable timings', () => {
    render(<LyricsPanel lyrics={syllableLyrics} currentTime={12} />)
    // Third line has no syllables; its container is just a plain <span>.
    const active = screen.getByText('Plain line').closest('[data-active]')
    expect(active).toHaveAttribute('data-active', 'true')
    expect(active?.querySelector('[data-testid="lyric-syllables"]')).toBeNull()
  })
})

describe('LyricsPanel — translation column', () => {
  afterEach(() => {
    cleanup()
  })

  test('renders the translation row when translation is present', () => {
    render(<LyricsPanel lyrics={syllableLyrics} currentTime={5.2} />)
    const translations = screen.getAllByTestId('lyric-translation')
    expect(translations).toHaveLength(1)
    expect(translations[0]?.textContent).toBe('Goodbye')
  })

  test('does not render a translation row when translation is absent', () => {
    render(<LyricsPanel lyrics={syllableLyrics} currentTime={0.25} />)
    // First and third lines have no translation; only the second is shown.
    const translations = screen.queryAllByTestId('lyric-translation')
    expect(translations).toHaveLength(1)
    expect(translations[0]?.textContent).toBe('Goodbye')
  })

  test('translation is omitted entirely when no line carries one', () => {
    const linesWithoutTranslation: LyricLine[] = [
      { time: 0, text: 'Just one' },
      { time: 5, text: 'Just two' },
    ]
    render(<LyricsPanel lyrics={linesWithoutTranslation} currentTime={2} />)
    expect(screen.queryByTestId('lyric-translation')).toBeNull()
  })

  test('aria-label includes the translation for screen readers', () => {
    render(<LyricsPanel lyrics={syllableLyrics} currentTime={5.2} />)
    // The second line is active and carries a translation; its <li> should
    // announce the combined label.
    const lineItems = document.querySelectorAll('[data-time="5"]')
    expect(lineItems.length).toBeGreaterThan(0)
    const lineItem = lineItems[0]?.closest('[role="button"]')
    expect(lineItem).toHaveAttribute('aria-label', '再见 — Goodbye')
  })

  test('aria-label falls back to plain text when no translation is present', () => {
    const linesWithoutTranslation: LyricLine[] = [
      { time: 0, text: 'No translation here' },
    ]
    render(<LyricsPanel lyrics={linesWithoutTranslation} currentTime={0} />)
    const lineItem = screen.getByText('No translation here').closest('[role="button"]')
    expect(lineItem).toHaveAttribute('aria-label', 'No translation here')
  })
})
