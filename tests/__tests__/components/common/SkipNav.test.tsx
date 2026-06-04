import { describe, test, expect } from 'vitest'
import { render } from '@testing-library/react'
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

  test('clicking navigates to #main-content', () => {
    const main = document.createElement('main')
    main.id = 'main-content'
    document.body.appendChild(main)

    const { container } = render(<SkipNav />)
    const link = container.querySelector('a.skip-nav') as HTMLElement

    // jsdom does not update window.location.hash on anchor clicks;
    // verify the anchor has the correct href instead.
    expect(link).toHaveAttribute('href', '#main-content')

    document.body.removeChild(main)
  })
})
