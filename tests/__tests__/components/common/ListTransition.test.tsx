import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ListTransition } from '@/components/common/ListTransition'

const SOURCE = resolve(process.cwd(), 'components/common/ListTransition.tsx')

afterEach(() => {
  cleanup()
})

describe('ListTransition', () => {
  test('renders items as normal list DOM', () => {
    const { container } = render(
      <ListTransition
        items={['Alpha', 'Beta', 'Gamma']}
        renderItem={(item, index) => (
          <span>
            {index}:{String(item)}
          </span>
        )}
      />
    )

    const list = screen.getByRole('list')
    const items = container.querySelectorAll('li')

    expect(list.tagName).toBe('UL')
    expect(items).toHaveLength(3)
    expect(screen.getByText('0:Alpha')).toBeInTheDocument()
    expect(screen.getByText('1:Beta')).toBeInTheDocument()
    expect(screen.getByText('2:Gamma')).toBeInTheDocument()
    expect(container.querySelector('[data-framer-motion]')).toBeNull()
  })

  test('merges container and item classes with CSS stagger classes', () => {
    const { container } = render(
      <ListTransition
        items={[1, 2]}
        className="custom-list"
        itemClassName="custom-item"
        renderItem={(item) => String(item)}
      />
    )

    const list = screen.getByRole('list')
    const items = container.querySelectorAll('li')

    expect(list).toHaveClass('space-y-3')
    expect(list).toHaveClass('section-enter')
    expect(list).toHaveClass('stagger-children')
    expect(list).toHaveClass('custom-list')
    items.forEach((item) => {
      expect(item).toHaveClass('custom-item')
      expect(item).not.toHaveAttribute('data-framer-motion')
    })
  })

  test('can disable stagger classes with animateChanges=false', () => {
    render(
      <ListTransition
        items={[1]}
        animateChanges={false}
        renderItem={(item) => String(item)}
      />
    )

    expect(screen.getByRole('list')).toHaveClass('section-enter')
    expect(screen.getByRole('list')).not.toHaveClass('stagger-children')
  })

  test('uses getKey to preserve item identity across rerenders', () => {
    const items = [
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta' },
    ]
    const { container, rerender } = render(
      <ListTransition
        items={items}
        getKey={(item) => (item as { id: string }).id}
        renderItem={(item) => (item as { label: string }).label}
      />
    )
    const firstNode = container.querySelector('li')

    rerender(
      <ListTransition
        items={[items[0], { id: 'c', label: 'Gamma' }]}
        getKey={(item) => (item as { id: string }).id}
        renderItem={(item) => (item as { label: string }).label}
      />
    )

    expect(container.querySelector('li')).toBe(firstNode)
    expect(screen.getByText('Gamma')).toBeInTheDocument()
  })

  test('does not import framer-motion runtime APIs', () => {
    const source = readFileSync(SOURCE, 'utf8')

    expect(source).not.toMatch(/from ['"]framer-motion['"]/)
    expect(source).not.toContain('motion.')
    expect(source).not.toContain('AnimatePresence')
    expect(source).not.toContain('initial=')
    expect(source).not.toContain('animate=')
    expect(source).not.toContain('exit=')
    expect(source).not.toContain('variants=')
  })
})
