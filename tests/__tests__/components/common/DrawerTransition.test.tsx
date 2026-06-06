import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DrawerTransition } from '@/components/common/DrawerTransition'

const sourcePath = join(process.cwd(), 'components/common/DrawerTransition.tsx')

afterEach(() => {
  cleanup()
})

describe('DrawerTransition', () => {
  it('does not render when closed', () => {
    render(
      <DrawerTransition open={false} ariaLabel="Music drawer">
        <p>Hidden drawer content</p>
      </DrawerTransition>
    )

    expect(screen.queryByText('Hidden drawer content')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders children in a regular dialog element when open', () => {
    const { container } = render(
      <DrawerTransition open ariaLabel="Music drawer" width="w-96" className="custom-drawer">
        <button type="button">Drawer child</button>
      </DrawerTransition>
    )

    const dialog = screen.getByRole('dialog', { name: 'Music drawer' })
    const overlay = container.firstElementChild

    expect(screen.getByText('Drawer child')).toBeInTheDocument()
    expect(overlay).toHaveClass('drawer-transition-overlay')
    expect(dialog.tagName).toBe('DIV')
    expect(dialog).toHaveClass('drawer-transition-panel')
    expect(dialog).toHaveClass('w-96')
    expect(dialog).toHaveClass('custom-drawer')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).not.toHaveAttribute('data-framer-motion')
  })

  it('supports aria-labelledby for the dialog name', () => {
    render(
      <DrawerTransition open ariaLabelledby="drawer-title">
        <h2 id="drawer-title">Drawer title</h2>
      </DrawerTransition>
    )

    expect(screen.getByRole('dialog', { name: 'Drawer title' })).toBeInTheDocument()
  })

  it('calls onClose from the overlay but not from drawer content', () => {
    const onClose = vi.fn()
    const { container } = render(
      <DrawerTransition open ariaLabel="Music drawer" onClose={onClose}>
        <button type="button">Inside drawer</button>
      </DrawerTransition>
    )

    fireEvent.click(screen.getByText('Inside drawer'))
    expect(onClose).not.toHaveBeenCalled()

    const overlay = container.firstElementChild
    expect(overlay).not.toBeNull()

    fireEvent.click(overlay as Element)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes on Escape while open', () => {
    const onClose = vi.fn()
    render(
      <DrawerTransition open ariaLabel="Music drawer" onClose={onClose}>
        <button type="button">Inside drawer</button>
      </DrawerTransition>
    )

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not import framer-motion runtime APIs', () => {
    const source = readFileSync(sourcePath, 'utf8')

    expect(source).not.toMatch(/from ['"]framer-motion['"]/)
    expect(source).not.toContain('motion.')
    expect(source).not.toContain('AnimatePresence')
    expect(source).not.toContain('initial=')
    expect(source).not.toContain('animate=')
    expect(source).not.toContain('exit=')
    expect(source).not.toContain('variants=')
  })
})
