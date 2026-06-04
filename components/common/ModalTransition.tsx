'use client'

import { type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { modalOverlay, modalContent } from '@/lib/animations'

// ── variants (inline to avoid circular imports) ───────────────────────────────

// ── props ─────────────────────────────────────────────────────────────────────

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

// ── component ─────────────────────────────────────────────────────────────────

/**
 * Provides animated overlay + content for modal dialogs.
 *
 * Wraps content with Framer Motion AnimatePresence for smooth enter/exit.
 * Pressing Escape or clicking the backdrop triggers `onClose`.
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
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          variants={modalOverlay}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={closeOnOverlay ? onClose : undefined}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Content */}
          <motion.div
            variants={modalContent}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto',
              className
            )}
            role="dialog"
            aria-modal="true"
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
