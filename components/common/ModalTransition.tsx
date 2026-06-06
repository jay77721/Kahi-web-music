'use client'

import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ModalTransitionProps {
  /** Whether the modal is open */
  open: boolean
  /** Callback when the modal should close */
  onClose?: () => void
  /** Content inside the modal */
  children: ReactNode
  /** Additional CSS classes */
  className?: string
  /** Whether to close on overlay click */
  closeOnOverlay?: boolean
}

/**
 * Provides CSS-only overlay + content for modal dialogs.
 *
 * Clicking the backdrop triggers `onClose`.
 *
 * @example
 * ```tsx
 * <ModalTransition open={isOpen} onClose={() => setIsOpen(false)}>
 *   <div className="glass rounded-2xl p-6">
 *     <h2>Modal Title</h2>
 *     <p>Modal content here.</p>
 *   </div>
 * </ModalTransition>
 * ```
 */
export function ModalTransition({
  open,
  onClose,
  children,
  className,
  closeOnOverlay = true,
}: ModalTransitionProps) {
  if (!open) return null

  return (
    <div
      className="modal-transition-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={closeOnOverlay ? onClose : undefined}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Content */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'modal-transition-content relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto',
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  )
}
