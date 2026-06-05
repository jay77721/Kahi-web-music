'use client'

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { RecommendGrid } from '@/components/discover/RecommendGrid'

// ---------------------------------------------------------------------------
// Mock ncmApi.personalized
// ---------------------------------------------------------------------------
vi.mock('@/lib/api', () => ({
  ncmApi: {
    personalized: vi.fn(),
  },
}))

import { ncmApi } from '@/lib/api'

describe('RecommendGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(ncmApi.personalized as ReturnType<typeof vi.fn>).mockReset()
    ;(ncmApi.personalized as ReturnType<typeof vi.fn>).mockResolvedValue([])
  })

  // ---- Basic rendering ----
  describe('basic rendering', () => {
    test('renders without crashing', () => {
      const { container } = render(<RecommendGrid />)
      expect(container.querySelector('.grid')).toBeTruthy()
    })

    test('renders grid container with responsive classes', () => {
      const { container } = render(<RecommendGrid />)
      const grid = container.querySelector('.grid')
      expect(grid).toBeTruthy()
      expect(grid).toHaveClass('grid-cols-2')
    })

    test('renders empty grid when no playlists', () => {
      const { container } = render(<RecommendGrid />)
      const gridItems = container.querySelectorAll('.group')
      expect(gridItems.length).toBe(0)
    })
  })

  // ---- Error handling ----
  describe('error handling', () => {
    test('handles API rejection gracefully', () => {
      ;(ncmApi.personalized as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network error')
      )

      expect(() => render(<RecommendGrid />)).not.toThrow()
    })
  })
})
