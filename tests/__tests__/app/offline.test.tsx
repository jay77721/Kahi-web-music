import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import OfflinePage from '@/app/offline/page'

describe('OfflinePage', () => {
  test('uses dynamic viewport height for stable mobile layout', () => {
    render(<OfflinePage />)

    const main = screen.getByRole('main')

    expect(main).toHaveClass('min-h-dvh')
    expect(main).not.toHaveClass('min-h-screen')
    expect(screen.getByRole('heading', { name: /offline/i })).toBeInTheDocument()
  })
})
