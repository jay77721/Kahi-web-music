import { describe, test, expect } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { SkipNav } from '@/components/common/SkipNav'

describe('SkipNav', () => {
  test('renders a link with href pointing to main content', () => {
    const { container } = render(<SkipNav />)
    const link = container.querySelector('a.skip-nav')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '#main-content')
  })

  test('is visually hidden by default', () => {
    const { container } = render(<SkipNav />)
    const link = container.querySelector('a.skip-nav')
    expect(link).toHaveClass('skip-nav')
  })

  test('focuses and becomes visible', () => {
    const { container } = render(<SkipNav />)
    const link = container.querySelector('a.skip-nav') as HTMLElement
    link.focus()
    expect(document.activeElement).toBe(link)
  })

  test('clicking moves focus to #main-content', () => {
    const main = document.createElement('main')
    main.id = 'main-content'
    document.body.appendChild(main)

    const { container } = render(<SkipNav />)
    const link = container.querySelector('a.skip-nav') as HTMLElement

    fireEvent.click(link)

    expect(link).toHaveAttribute('href', '#main-content')
    expect(main).toHaveAttribute('tabindex', '-1')
    expect(document.activeElement).toBe(main)

    document.body.removeChild(main)
  })
})
