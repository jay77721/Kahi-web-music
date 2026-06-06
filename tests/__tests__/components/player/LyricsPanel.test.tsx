import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, test, expect, vi, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { render, screen, fireEvent } from '@/tests/helpers/test-utils'
import { LyricsPanel } from '@/components/player/LyricsPanel'
import type { LyricLine } from '@/types'

const LYRICS_PANEL_SOURCE = join(process.cwd(), 'components/player/LyricsPanel.tsx')

const sampleLyrics: LyricLine[] = [
  { time: 0, text: 'First line' },
  { time: 5, text: 'Second line', translation: '第二行' },
  { time: 10, text: 'Third line' },
]

describe('LyricsPanel', () => {
  afterEach(() => {
    cleanup()
  })

  test('renders the list of lyric lines', () => {
    render(<LyricsPanel lyrics={sampleLyrics} currentTime={0} />)
    expect(screen.getByText('First line')).toBeInTheDocument()
    expect(screen.getByText('Second line')).toBeInTheDocument()
    expect(screen.getByText('Third line')).toBeInTheDocument()
  })

  test('does not import framer-motion for lyric rows', () => {
    const source = readFileSync(LYRICS_PANEL_SOURCE, 'utf8')
    expect(source).not.toContain("from 'framer-motion'")
    expect(source).not.toContain('from "framer-motion"')
    expect(source).not.toContain('AnimatePresence')
    expect(source).not.toMatch(/\bmotion\./)
  })

  test('renders plain list items without framer-motion markers', () => {
    const { container } = render(<LyricsPanel lyrics={sampleLyrics} currentTime={0} />)
    expect(container.querySelector('[data-framer-motion]')).toBeNull()
    expect(container.querySelectorAll('li[data-active]')).toHaveLength(sampleLyrics.length)
  })

  test('renders the translation when present', () => {
    render(<LyricsPanel lyrics={sampleLyrics} currentTime={0} />)
    expect(screen.getByText('第二行')).toBeInTheDocument()
  })

  test('marks the line matching the current time as active', () => {
    render(<LyricsPanel lyrics={sampleLyrics} currentTime={5.5} />)
    const active = screen.getByText('Second line').closest('[data-active]')
    expect(active).toHaveAttribute('data-active', 'true')
    const inactive = screen.getByText('First line').closest('[data-active]')
    expect(inactive).toHaveAttribute('data-active', 'false')
  })

  test('marks the last passed timestamp as active', () => {
    render(<LyricsPanel lyrics={sampleLyrics} currentTime={12} />)
    const active = screen.getByText('Third line').closest('[data-active]')
    expect(active).toHaveAttribute('data-active', 'true')
  })

  test('shows the empty state when no lyrics are provided', () => {
    render(<LyricsPanel lyrics={[]} currentTime={0} />)
    expect(screen.getByText('暂无歌词')).toBeInTheDocument()
  })

  test('invokes onSeek with the line time when clicked', () => {
    const onSeek = vi.fn()
    render(<LyricsPanel lyrics={sampleLyrics} currentTime={0} onSeek={onSeek} />)

    const target = screen.getByText('Second line').closest('[data-time]')
    expect(target).toHaveAttribute('data-time', '5')

    fireEvent.click(target!)
    expect(onSeek).toHaveBeenCalledTimes(1)
    expect(onSeek).toHaveBeenCalledWith(5)
  })

  test('invokes onSeek on Enter key press', () => {
    const onSeek = vi.fn()
    render(<LyricsPanel lyrics={sampleLyrics} currentTime={0} onSeek={onSeek} />)

    const target = screen.getByText('Third line').closest('[data-time]')
    fireEvent.keyDown(target!, { key: 'Enter' })

    expect(onSeek).toHaveBeenCalledWith(10)
  })
})
