import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { Song } from '@/types/song'
import { mockSong } from '@/tests/helpers/mock-data'
import { RankingPreview } from '@/components/discover/RankingPreview'

const swrState = vi.hoisted(() => ({
  data: undefined as unknown,
  isLoading: false,
}))

vi.mock('swr', () => ({
  default: () => swrState,
}))

function makeSong(id: number, name: string): Song {
  return {
    ...mockSong,
    id,
    name,
    ar: [{ id, name: `Artist ${id}` }],
    al: {
      id,
      name: `Album ${id}`,
      picUrl: `https://images.example.com/${id}.jpg`,
    },
  }
}

function makeRanking(id: number, name: string, trackCount: number) {
  return {
    id,
    name,
    coverUrl: `https://images.example.com/ranking-${id}.jpg`,
    tracks: Array.from({ length: trackCount }, (_, index) =>
      makeSong(id * 100 + index, `${name} Track ${String(index + 1).padStart(2, '0')}`)
    ),
  }
}

describe('RankingPreview', () => {
  beforeEach(() => {
    swrState.data = undefined
    swrState.isLoading = false
  })

  afterEach(() => {
    cleanup()
  })

  test('renders only the first five tracks per ranking preview', () => {
    swrState.data = [
      makeRanking(1, 'Rise', 8),
      makeRanking(2, 'New', 7),
      makeRanking(3, 'Hot', 6),
    ]

    render(<RankingPreview />)

    expect(screen.getByText('Rise Track 05')).toBeInTheDocument()
    expect(screen.queryByText('Rise Track 06')).not.toBeInTheDocument()
    expect(screen.queryByText('New Track 06')).not.toBeInTheDocument()
    expect(screen.queryByText('Hot Track 06')).not.toBeInTheDocument()
    expect(screen.getAllByAltText('Album cover')).toHaveLength(15)
  })

  test('keeps the full leaderboard links available', () => {
    swrState.data = [makeRanking(1, 'Rise', 8)]

    render(<RankingPreview />)

    expect(screen.getByRole('link')).toHaveAttribute('href', '/leaderboard?id=1')
  })
})
