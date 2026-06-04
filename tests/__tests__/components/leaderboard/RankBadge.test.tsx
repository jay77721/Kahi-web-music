import { describe, test, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { RankBadge, getRankVariant } from '@/components/leaderboard/RankBadge'

afterEach(() => {
  cleanup()
})

describe('RankBadge', () => {
  describe('getRankVariant', () => {
    test('rank 1 maps to gold', () => {
      expect(getRankVariant(1)).toBe('gold')
    })

    test('rank 2 maps to silver', () => {
      expect(getRankVariant(2)).toBe('silver')
    })

    test('rank 3 maps to bronze', () => {
      expect(getRankVariant(3)).toBe('bronze')
    })

    test('rank 4 and above map to muted', () => {
      expect(getRankVariant(4)).toBe('muted')
      expect(getRankVariant(10)).toBe('muted')
      expect(getRankVariant(99)).toBe('muted')
    })
  })

  describe('rendering', () => {
    test('renders the rank number as visible text', () => {
      render(<RankBadge rank={1} />)
      expect(screen.getByTestId('rank-badge')).toHaveTextContent('1')
    })

    test('exposes the rank number and variant via data-* attributes', () => {
      render(<RankBadge rank={2} />)
      const badge = screen.getByTestId('rank-badge')
      expect(badge).toHaveAttribute('data-rank', '2')
      expect(badge).toHaveAttribute('data-variant', 'silver')
    })

    test('rank 1 gets the gold gradient class', () => {
      render(<RankBadge rank={1} />)
      const badge = screen.getByTestId('rank-badge')
      expect(badge.className).toContain('rank-gold')
    })

    test('rank 2 gets the silver gradient class', () => {
      render(<RankBadge rank={2} />)
      const badge = screen.getByTestId('rank-badge')
      expect(badge.className).toContain('rank-silver')
    })

    test('rank 3 gets the bronze gradient class', () => {
      render(<RankBadge rank={3} />)
      const badge = screen.getByTestId('rank-badge')
      expect(badge.className).toContain('rank-bronze')
    })

    test('other ranks do not get any medal gradient class', () => {
      render(<RankBadge rank={5} />)
      const badge = screen.getByTestId('rank-badge')
      expect(badge.className).not.toContain('rank-gold')
      expect(badge.className).not.toContain('rank-silver')
      expect(badge.className).not.toContain('rank-bronze')
    })

    test('aria-label announces the rank in Chinese', () => {
      render(<RankBadge rank={7} />)
      expect(screen.getByTestId('rank-badge')).toHaveAttribute('aria-label', '第 7 名')
    })

    test('forwards custom className', () => {
      render(<RankBadge rank={1} className="extra-class" />)
      const badge = screen.getByTestId('rank-badge')
      expect(badge).toHaveClass('extra-class')
    })
  })
})
