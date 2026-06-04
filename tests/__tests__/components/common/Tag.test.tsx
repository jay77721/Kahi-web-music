import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Tag } from '@/components/common/Tag'

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
    const { container } = render(<Tag label="Clickable" onClick={handleClick} />)
    // The framer-motion mock renders motion.button as a <div>, so we
    // query by the aria-label that the component sets on the wrapper.
    const btn = container.querySelector('[aria-label="Clickable"]') as HTMLElement
    expect(btn).toBeInTheDocument()
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
    const { container } = render(<Tag label="A" active onClick={() => {}} />)
    const btn = container.querySelector('[aria-label="A"]')
    expect(btn?.getAttribute('aria-pressed')).toBe('true')
  })

  test('default aria-pressed is false', () => {
    const { container } = render(<Tag label="B" onClick={() => {}} />)
    const btn = container.querySelector('[aria-label="B"]')
    expect(btn?.getAttribute('aria-pressed')).toBe('false')
  })

  test('renders the tag-gradient-border class for hover styling', () => {
    const { container } = render(<Tag label="X" onClick={() => {}} />)
    expect(container.querySelector('.tag-gradient-border')).toBeTruthy()
  })
})
