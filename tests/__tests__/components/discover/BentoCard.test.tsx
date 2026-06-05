'use client'

import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { Sparkles } from 'lucide-react'
import { BentoCard } from '@/components/discover/BentoCard'

afterEach(() => {
  cleanup()
})

describe('BentoCard', () => {
  // ---- Basic rendering ----
  describe('basic rendering', () => {
    test('renders the title', () => {
      const { container } = render(<BentoCard size="md" title="私人雷达 A" href="/discover" />)
      expect(container.textContent).toContain('私人雷达 A')
    })

    test('renders the subtitle when provided', () => {
      const { container } = render(
        <BentoCard
          size="md"
          title="私人雷达 B"
          subtitle="专属推荐 B"
          href="/discover"
        />
      )
      expect(container.textContent).toContain('专属推荐 B')
    })

    test('marks cover images as lazy and async decoded', () => {
      const { container } = render(
        <BentoCard
          size="lg"
          title="Cover image"
          cover="https://images.example.com/cover.jpg"
          href="/cover"
        />
      )
      const image = container.querySelector('img')
      expect(image).toHaveAttribute('loading', 'lazy')
      expect(image).toHaveAttribute('decoding', 'async')
      expect(image).toHaveAttribute('sizes', '(max-width: 768px) 100vw, 33vw')
    })

    test('does not render subtitle element when omitted', () => {
      const { container } = render(<BentoCard size="md" title="私人雷达 C" href="/discover-c" />)
      const paragraphs = container.querySelectorAll('p')
      expect(paragraphs.length).toBe(0)
    })
  })

  // ---- Size variants ----
  describe('size variants', () => {
    test('sm size uses col-span-3 on md+', () => {
      const { container } = render(<BentoCard size="sm" title="Small D" href="/x-d" />)
      const card = container.querySelector('[class*="col-span-3"]')
      expect(card).toBeTruthy()
    })

    test('md size uses col-span-4 on md+', () => {
      const { container } = render(<BentoCard size="md" title="Medium E" href="/x-e" />)
      const card = container.querySelector('[class*="col-span-4"]')
      expect(card).toBeTruthy()
    })

    test('lg size uses row-span-2', () => {
      const { container } = render(<BentoCard size="lg" title="Large F" href="/x-f" />)
      const card = container.querySelector('[class*="row-span-2"]')
      expect(card).toBeTruthy()
    })
  })

  // ---- Link vs button rendering ----
  describe('link vs button', () => {
    test('renders an anchor element when href is provided', () => {
      const { container } = render(<BentoCard size="md" title="Link G" href="/discover-g" />)
      const anchor = container.querySelector('a[href="/discover-g"]')
      expect(anchor).toBeTruthy()
    })

    test('renders a button element when only onClick is provided', () => {
      const { container } = render(
        <BentoCard size="md" title="Button H" onClick={() => undefined} />
      )
      const button = container.querySelector('button')
      expect(button).toBeTruthy()
    })

    test('button does not contain anchor', () => {
      const { container } = render(
        <BentoCard size="md" title="Button I" onClick={() => undefined} />
      )
      expect(container.querySelector('a')).toBeNull()
    })
  })

  // ---- Interaction ----
  describe('interaction', () => {
    test('uses CSS hover and pressed transforms instead of framer-motion', () => {
      const { container } = render(<BentoCard size="md" title="Motion free" href="/motion-free" />)
      const card = container.querySelector('.group')

      expect(card).toHaveClass('hover:scale-[1.02]')
      expect(card).toHaveClass('active:scale-[0.99]')
      expect(container.querySelector('[data-framer-motion]')).toBeNull()
    })

    test('clicking a button card triggers onClick', () => {
      const handleClick = vi.fn()
      const { container } = render(
        <BentoCard size="md" title="Click J" onClick={handleClick} />
      )
      const button = container.querySelector('button')
      if (!button) throw new Error('button not found')
      fireEvent.click(button)
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    test('link card has the correct aria-label', () => {
      const { container } = render(
        <BentoCard size="md" title="私人雷达 K" subtitle="专属推荐 K" href="/discover-k" />
      )
      const link = container.querySelector('a[aria-label="私人雷达 K: 专属推荐 K"]')
      expect(link).toBeTruthy()
    })
  })

  // ---- Accessibility ----
  describe('accessibility', () => {
    test('uses accessible name without subtitle', () => {
      const { container } = render(<BentoCard size="md" title="Hot L" href="/hot-l" />)
      const link = container.querySelector('a[aria-label="Hot L"]')
      expect(link).toBeTruthy()
    })

    test('renders badge when provided', () => {
      const { container } = render(
        <BentoCard size="md" title="New M" badge="NEW" href="/x-m" />
      )
      expect(container.textContent).toContain('NEW')
    })

    test('renders icon when provided (aria-hidden)', () => {
      const { container } = render(
        <BentoCard size="md" title="Sparkle N" icon={Sparkles} href="/x-n" />
      )
      const iconWrapper = container.querySelector('[aria-hidden="true"]')
      expect(iconWrapper).toBeTruthy()
    })
  })

  // ---- Defensive: prevent unused-import lint warning ----
  test('screen query import is available (smoke)', () => {
    expect(typeof screen.getByRole).toBe('function')
  })
})
