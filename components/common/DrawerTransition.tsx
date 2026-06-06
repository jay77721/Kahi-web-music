'use client'

import { type ReactNode, useCallback, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true'
  )
}

interface DrawerTransitionBaseProps {
  /** Whether the drawer is open */
  open: boolean
  /** Callback when the drawer should close */
  onClose?: () => void
  /** Drawer content */
  children: ReactNode
  /** Additional CSS classes */
  className?: string
  /** Drawer width (Tailwind class, default: 'w-80') */
  width?: string
  /** Close on overlay click */
  closeOnOverlay?: boolean
}

type DrawerTransitionLabelProps =
  | {
      /** Accessible dialog label when no visible title is referenced */
      ariaLabel: string
      ariaLabelledby?: never
    }
  | {
      ariaLabel?: never
      /** ID of the visible dialog title */
      ariaLabelledby: string
    }

type DrawerTransitionProps = DrawerTransitionBaseProps & DrawerTransitionLabelProps

/**
 * CSS-only side drawer (slides in from the right).
 *
 * @example
 * ```tsx
 * <DrawerTransition open={drawerOpen} onClose={() => setDrawerOpen(false)} width="w-96">
 *   <div className="p-4">
 *     <h2>Drawer Title</h2>
 *     <p>Drawer content.</p>
 *   </div>
 * </DrawerTransition>
 * ```
 */
export function DrawerTransition({
  open,
  onClose,
  children,
  className,
  width = 'w-80',
  closeOnOverlay = true,
  ariaLabel,
  ariaLabelledby,
}: DrawerTransitionProps) {
  const drawerRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  const handleClose = useCallback(() => {
    onCloseRef.current?.()
  }, [])

  useEffect(() => {
    if (!open) return

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    drawerRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose()
        return
      }

      if (event.key !== 'Tab' || !drawerRef.current) return

      const focusableElements = getFocusableElements(drawerRef.current)
      if (focusableElements.length === 0) {
        event.preventDefault()
        drawerRef.current.focus()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      const activeElement = document.activeElement

      if (activeElement instanceof Node && !drawerRef.current.contains(activeElement)) {
        event.preventDefault()
        ;(event.shiftKey ? lastElement : firstElement).focus()
        return
      }

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
        return
      }

      if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (previousFocusRef.current?.isConnected) {
        previousFocusRef.current.focus()
      }
    }
  }, [handleClose, open])

  if (!open) return null

  return (
    <div
      className="drawer-transition-overlay fixed inset-0 z-50"
      onClick={closeOnOverlay ? handleClose : undefined}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'drawer-transition-panel absolute right-0 top-0 h-full outline-none',
          width,
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
      >
        {children}
      </div>
    </div>
  )
}
