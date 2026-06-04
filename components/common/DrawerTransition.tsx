'use client'

import { type ReactNode } from 'react'
import { motion, type Variants, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

// ── variants ──────────────────────────────────────────────────────────────────

const drawerVariants: Variants = {
  hidden: { x: '100%' },
  visible: {
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    x: '100%',
    transition: { duration: 200, ease: 'easeIn' },
  },
}

const drawerOverlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 200 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 150 },
  },
}

// ── props ─────────────────────────────────────────────────────────────────────

interface DrawerTransitionProps {
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

// ── component ─────────────────────────────────────────────────────────────────

/**
 * Animated side drawer (slides in from the right).
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
}: DrawerTransitionProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          variants={drawerOverlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-50"
          onClick={closeOnOverlay ? onClose : undefined}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Drawer panel */}
          <motion.div
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            className={cn('absolute right-0 top-0 h-full', width, className)}
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
