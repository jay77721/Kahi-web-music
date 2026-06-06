import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { SkeletonLoader } from '@/components/common/SkeletonLoader'

const SOURCE = resolve(process.cwd(), 'components/common/SkeletonLoader.tsx')

afterEach(() => {
  cleanup()
})

describe('SkeletonLoader', () => {
  test('renders a single skeleton as normal DOM with shimmer classes', () => {
    const { container } = render(<SkeletonLoader count={1} />)
    const skeleton = container.firstElementChild as HTMLElement

    expect(skeleton.tagName).toBe('DIV')
    expect(skeleton).toHaveClass('w-full')
    expect(skeleton).toHaveClass('h-4')
    expect(skeleton).toHaveClass('animate-shimmer')
    expect(skeleton).toHaveClass('bg-[length:200%_100%]')
    expect(container.querySelector('[data-framer-motion]')).toBeNull()
  })

  test('renders count skeleton rows in a stacked container', () => {
    const { container } = render(<SkeletonLoader count={4} gap="gap-2" className="custom-stack" />)
    const wrapper = container.firstElementChild as HTMLElement
    const skeletons = wrapper.children

    expect(wrapper).toHaveClass('flex')
    expect(wrapper).toHaveClass('flex-col')
    expect(wrapper).toHaveClass('gap-2')
    expect(wrapper).toHaveClass('custom-stack')
    expect(skeletons).toHaveLength(4)
    Array.from(skeletons).forEach((skeleton, index) => {
      expect(skeleton).toHaveClass('animate-shimmer')
      expect((skeleton as HTMLElement).style.animationDelay).toBe(`${index * 100}ms`)
      expect(skeleton).not.toHaveAttribute('data-framer-motion')
    })
  })

  test('applies size and circle props to skeleton items', () => {
    const { container } = render(
      <SkeletonLoader count={2} width="w-12" height="h-12" circle />
    )
    const skeletons = container.querySelectorAll('.animate-shimmer')

    expect(skeletons).toHaveLength(2)
    skeletons.forEach((skeleton) => {
      expect(skeleton).toHaveClass('w-12')
      expect(skeleton).toHaveClass('h-12')
      expect(skeleton).toHaveClass('rounded-full')
    })
  })

  test('applies className to the skeleton itself when count is one', () => {
    const { container } = render(<SkeletonLoader count={1} className="single-skeleton" />)

    expect(container.firstElementChild).toHaveClass('single-skeleton')
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
