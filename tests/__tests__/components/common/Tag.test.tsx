import { readFileSync } from 'node:fs'
import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Tag } from '@/components/common/Tag'

const TAG_SOURCE = 'components/common/Tag.tsx'

describe('Tag', () => {
  test('renders the label text', () => {
    render(<Tag label="Chill" />)
    expect(screen.getByText('Chill')).toBeInTheDocument()
  })

  test('renders without onClick without crashing', () => {
    const { container } = render(<Tag label="Static" />)
    // When no onClick is provided, no interactive element is rendered.
    expect(container.querySelector('button')).toBeNull()
    expect(screen.getByText('Static')).toBeInTheDocument()
  })

  test('clicking the tag triggers onClick', () => {
    const handleClick = vi.fn()
    render(<Tag label="Clickable" onClick={handleClick} />)
    const btn = screen.getByRole('button', { name: 'Clickable' })

    expect(btn.tagName).toBe('BUTTON')
    fireEvent.click(btn)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  test('applies active styles when active is true', () => {
    const { container } = render(<Tag label="Active" active onClick={() => {}} />)
    const inner = container.querySelector('.tag-gradient-border')
    expect(inner?.className).toContain('text-[var(--tag-accent,var(--accent))]')
  })

  test('does not apply active styles when active is false', () => {
    const { container } = render(<Tag label="Idle" onClick={() => {}} />)
    const inner = container.querySelector('.tag-gradient-border')
    expect(inner?.className).not.toContain('text-[var(--tag-accent,var(--accent))]')
  })

  test('applies custom color via inline --tag-accent variable', () => {
    const { container } = render(
      <Tag label="Colored" color="#ff00ff" onClick={() => {}} />
    )
    const inner = container.querySelector('.tag-gradient-border') as HTMLElement | null
    expect(inner?.style.getPropertyValue('--tag-accent')).toBe('#ff00ff')
  })

  test('forwards custom className to the inner pill (static)', () => {
    const { container } = render(<Tag label="Styled" className="my-tag-class" />)
    expect(container.querySelector('.my-tag-class')).toBeTruthy()
  })

  test('forwards className to the inner pill (interactive)', () => {
    const { container } = render(
      <Tag label="Styled" className="my-tag-class" onClick={() => {}} />
    )
    expect(container.querySelector('.my-tag-class')).toBeTruthy()
  })

  test('sets aria-pressed to reflect active state', () => {
    render(<Tag label="A" active onClick={() => {}} />)
    expect(screen.getByRole('button', { name: 'A' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('default aria-pressed is false', () => {
    render(<Tag label="B" onClick={() => {}} />)
    expect(screen.getByRole('button', { name: 'B' })).toHaveAttribute('aria-pressed', 'false')
  })

  test('renders the tag-gradient-border class for hover styling', () => {
    const { container } = render(<Tag label="X" onClick={() => {}} />)
    expect(container.querySelector('.tag-gradient-border')).toBeTruthy()
  })

  test('uses CSS hover and active transforms without framer-motion markers', () => {
    const { container } = render(<Tag label="CSS Motion" onClick={() => {}} />)
    const button = screen.getByRole('button', { name: 'CSS Motion' })

    expect(button).toHaveClass('hover-scale')
    expect(button).toHaveClass('active-scale')
    expect(container.querySelector('[data-framer-motion]')).toBeNull()
  })

  test('does not import framer-motion', () => {
    const source = readFileSync(TAG_SOURCE, 'utf8')

    expect(source).not.toContain('framer-motion')
    expect(source).not.toContain('motion.')
  })
})
