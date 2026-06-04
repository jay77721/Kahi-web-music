import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  test('renders with text content', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeVisible()
  })

  test('renders with default variant', () => {
    const { container } = render(<Button>Default</Button>)
    const btn = container.firstChild as HTMLElement
    expect(btn.className).toContain('inline-flex')
  })

  test('renders as disabled', () => {
    render(<Button disabled>Disabled</Button>)
    const btn = screen.getByRole('button', { name: /disabled/i })
    expect(btn).toBeDisabled()
  })

  test('renders with icon', () => {
    const { container } = render(
      <Button>
        <span data-testid="icon">★</span>
        With Icon
      </Button>
    )
    expect(container.querySelector('[data-testid="icon"]')).toBeTruthy()
  })

  test('renders as link when asChild is used', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    )
    const link = screen.getByRole('link', { name: /link button/i })
    expect(link).toBeInTheDocument()
    expect(link.getAttribute('href')).toBe('/test')
  })
})
