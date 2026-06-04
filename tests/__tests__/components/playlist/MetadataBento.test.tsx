import { describe, test, expect, afterEach, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Music, Heart, User, Calendar } from 'lucide-react'
import { MetadataBento, type BentoItem } from '@/components/playlist/MetadataBento'

// Mock lucide-react icons to keep DOM minimal and deterministic.
vi.mock('lucide-react', () => ({
  Music: () => <span data-testid="icon-music" />,
  Heart: () => <span data-testid="icon-heart" />,
  User: () => <span data-testid="icon-user" />,
  Calendar: () => <span data-testid="icon-calendar" />,
}))

const baseItems: BentoItem[] = [
  { icon: <Music />, label: 'Play Count', value: '123万', size: 'lg' },
  { icon: <Heart />, label: 'Favorites', value: '5.6万', size: 'md' },
  { icon: <User />, label: 'Creator', value: 'Jay', size: 'sm' },
  { icon: <Calendar />, label: 'Created', value: '2024-01-01', size: 'sm' },
]

afterEach(() => {
  cleanup()
})

describe('MetadataBento', () => {
  describe('rendering', () => {
    test('renders all provided items', () => {
      render(<MetadataBento items={baseItems} />)
      expect(screen.getByText('Play Count')).toBeInTheDocument()
      expect(screen.getByText('Favorites')).toBeInTheDocument()
      expect(screen.getByText('Creator')).toBeInTheDocument()
      expect(screen.getByText('Created')).toBeInTheDocument()
    })

    test('renders all metric values', () => {
      render(<MetadataBento items={baseItems} />)
      expect(screen.getByText('123万')).toBeInTheDocument()
      expect(screen.getByText('5.6万')).toBeInTheDocument()
      expect(screen.getByText('Jay')).toBeInTheDocument()
      expect(screen.getByText('2024-01-01')).toBeInTheDocument()
    })

    test('renders an empty container when no items provided', () => {
      const { container } = render(<MetadataBento items={[]} />)
      expect(container.firstChild).toBeNull()
    })

    test('uses list role with accessible label', () => {
      render(<MetadataBento items={baseItems} />)
      const list = screen.getByRole('list')
      expect(list).toHaveAttribute('aria-label', 'Playlist metadata')
    })

    test('each item is wrapped in a listitem', () => {
      render(<MetadataBento items={baseItems} />)
      expect(screen.getAllByRole('listitem')).toHaveLength(baseItems.length)
    })
  })

  describe('size variants', () => {
    test('applies sm grid classes for small items', () => {
      render(<MetadataBento items={baseItems} />)
      const smCard = screen.getByText('Creator').closest('[data-bento-size]')
      expect(smCard).toHaveAttribute('data-bento-size', 'sm')
      expect(smCard).toHaveClass('col-span-6')
      expect(smCard).toHaveClass('md:col-span-3')
    })

    test('applies md grid classes for medium items', () => {
      render(<MetadataBento items={baseItems} />)
      const mdCard = screen.getByText('Favorites').closest('[data-bento-size]')
      expect(mdCard).toHaveAttribute('data-bento-size', 'md')
      expect(mdCard).toHaveClass('md:col-span-4')
      expect(mdCard).toHaveClass('row-span-2')
    })

    test('applies lg grid classes for large items', () => {
      render(<MetadataBento items={baseItems} />)
      const lgCard = screen.getByText('Play Count').closest('[data-bento-size]')
      expect(lgCard).toHaveAttribute('data-bento-size', 'lg')
      expect(lgCard).toHaveClass('md:col-span-6')
      expect(lgCard).toHaveClass('row-span-2')
    })

    test('defaults to sm size when size prop is omitted', () => {
      const items: BentoItem[] = [
        { icon: <Music />, label: 'Default Size', value: '42' },
      ]
      render(<MetadataBento items={items} />)
      const card = screen.getByText('Default Size').closest('[data-bento-size]')
      expect(card).toHaveAttribute('data-bento-size', 'sm')
    })
  })

  describe('hover state', () => {
    test('applies bento-card class for hover styling', () => {
      render(<MetadataBento items={baseItems} />)
      const card = screen.getByText('Play Count').closest('[data-bento-size]')
      expect(card).toHaveClass('bento-card')
    })

    test('applies rounded-2xl and bg-white/5 base styles', () => {
      render(<MetadataBento items={baseItems} />)
      const card = screen.getByText('Play Count').closest('[data-bento-size]')
      expect(card).toHaveClass('rounded-2xl')
      expect(card).toHaveClass('bg-white/5')
    })

    test('container has the bento-grid class', () => {
      const { container } = render(<MetadataBento items={baseItems} />)
      const grid = container.querySelector('.bento-grid')
      expect(grid).toBeTruthy()
      expect(grid).toHaveClass('grid-cols-12')
    })
  })

  describe('styling', () => {
    test('passes custom className to the grid container', () => {
      const { container } = render(<MetadataBento items={baseItems} className="my-bento" />)
      const grid = container.querySelector('.bento-grid')
      expect(grid).toHaveClass('my-bento')
    })

    test('does not set --bento-accent when color is omitted', () => {
      render(<MetadataBento items={baseItems} />)
      const card = screen.getByText('Play Count').closest('[data-bento-size]') as HTMLElement
      // No color in baseItems; CSS var should not be set
      expect(card.style.getPropertyValue('--bento-accent')).toBe('')
    })
  })
})
