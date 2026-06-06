import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { GridTransition } from '@/components/common/GridTransition'

const SOURCE = resolve(process.cwd(), 'components/common/GridTransition.tsx')

afterEach(() => {
  cleanup()
})

describe('GridTransition', () => {
  test('renders children as normal grid cell DOM', () => {
    const { container } = render(
      <GridTransition
        items={['A', 'B', 'C']}
        renderItem={(item, index) => (
          <button type="button">
            {index}:{String(item)}
          </button>
        )}
      />
    )

    const grid = container.firstElementChild
    const cells = grid?.children ?? []

    expect(grid?.tagName).toBe('DIV')
    expect(cells).toHaveLength(3)
    expect(screen.getByRole('button', { name: '0:A' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1:B' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2:C' })).toBeInTheDocument()
    expect(container.querySelector('[data-framer-motion]')).toBeNull()
  })

  test('uses default columns and merges container and item classes', () => {
    const { container } = render(
      <GridTransition
        items={[1, 2]}
        className="custom-grid"
        itemClassName="custom-cell"
        renderItem={(item) => String(item)}
      />
    )

    const grid = container.firstElementChild as HTMLElement
    const cells = container.querySelectorAll('.custom-cell')

    expect(grid).toHaveClass('grid')
    expect(grid).toHaveClass('section-enter')
    expect(grid).toHaveClass('stagger-children')
    expect(grid).toHaveClass('grid-cols-2')
    expect(grid).toHaveClass('md:grid-cols-3')
    expect(grid).toHaveClass('lg:grid-cols-4')
    expect(grid).toHaveClass('gap-4')
    expect(grid).toHaveClass('custom-grid')
    expect(cells).toHaveLength(2)
  })

  test('accepts custom column classes', () => {
    const { container } = render(
      <GridTransition
        items={[1]}
        columns="grid-cols-1 sm:grid-cols-2 gap-2"
        renderItem={(item) => String(item)}
      />
    )

    const grid = container.firstElementChild as HTMLElement

    expect(grid).toHaveClass('grid-cols-1')
    expect(grid).toHaveClass('sm:grid-cols-2')
    expect(grid).toHaveClass('gap-2')
  })

  test('uses getKey to preserve cell identity across rerenders', () => {
    const items = [
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta' },
    ]
    const { container, rerender } = render(
      <GridTransition
        items={items}
        getKey={(item) => (item as { id: string }).id}
        renderItem={(item) => (item as { label: string }).label}
      />
    )
    const firstCell = container.firstElementChild?.firstElementChild

    rerender(
      <GridTransition
        items={[items[0], { id: 'c', label: 'Gamma' }]}
        getKey={(item) => (item as { id: string }).id}
        renderItem={(item) => (item as { label: string }).label}
      />
    )

    expect(container.firstElementChild?.firstElementChild).toBe(firstCell)
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
