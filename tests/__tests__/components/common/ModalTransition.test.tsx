import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ModalTransition } from '@/components/common/ModalTransition'

const sourcePath = join(process.cwd(), 'components/common/ModalTransition.tsx')

afterEach(() => {
  cleanup()
})

describe('ModalTransition', () => {
  it('does not render when closed', () => {
    render(
      <ModalTransition open={false}>
        <p>Hidden modal content</p>
      </ModalTransition>
    )

    expect(screen.queryByText('Hidden modal content')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders children in a regular dialog element when open', () => {
    const { container } = render(
      <ModalTransition open className="custom-modal">
        <button type="button">Modal child</button>
      </ModalTransition>
    )

    const dialog = screen.getByRole('dialog')
    const overlay = container.firstElementChild

    expect(screen.getByText('Modal child')).toBeInTheDocument()
    expect(overlay).toHaveClass('modal-transition-overlay')
    expect(dialog.tagName).toBe('DIV')
    expect(dialog).toHaveClass('modal-transition-content')
    expect(dialog).toHaveClass('custom-modal')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).not.toHaveAttribute('data-framer-motion')
  })

  it('calls onClose from the overlay but not from modal content', () => {
    const onClose = vi.fn()
    const { container } = render(
      <ModalTransition open onClose={onClose}>
        <button type="button">Inside modal</button>
      </ModalTransition>
    )

    fireEvent.click(screen.getByText('Inside modal'))
    expect(onClose).not.toHaveBeenCalled()

    const overlay = container.firstElementChild
    expect(overlay).not.toBeNull()

    fireEvent.click(overlay as Element)
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
