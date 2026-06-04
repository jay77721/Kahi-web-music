/**
 * Reusable Framer Motion animation presets.
 *
 * All presets respect `prefers-reduced-motion` when combined with `useReducedMotion`.
 * Uses spring physics for natural feel and GPU-accelerated properties (transform, opacity).
 */

import {
  type Variants,
} from 'framer-motion'
import { springPresets, easingPresets } from '@/lib/spring-config'

// ── helpers ────────────────────────────────────────────────────────────────────

/** Fade out variant (used as exit) */
export const fadeOutVariant = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
} as const

/** Fade in (entering) */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: easingPresets.normal / 1000, ease: easingPresets.easeOut },
  },
  exit: {
    opacity: 0,
    transition: { duration: easingPresets.fast / 1000, ease: easingPresets.easeIn },
  },
}

/**
 * Fade in with optional slide direction.
 * @param direction - Slide direction for the hidden state
 */
export function fadeInSlide(
  direction: 'up' | 'down' | 'left' | 'right' = 'up'
): Variants {
  const offset: Record<string, { x?: number; y?: number }> = {
    up: { y: 20 },
    down: { y: -20 },
    left: { x: 20 },
    right: { x: -20 },
  }

  const offsetVal = offset[direction]

  return {
    hidden: { opacity: 0, ...offsetVal },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration: easingPresets.slow / 1000,
        ease: easingPresets.expoOut,
      },
    },
    exit: {
      opacity: 0,
      ...offsetVal,
      transition: {
        duration: easingPresets.fast / 1000,
        ease: easingPresets.easeIn,
      },
    },
  }
}

/** Slide in from top */
export const slideInFromTop: Variants = fadeInSlide('down')

/** Slide in from bottom */
export const slideInFromBottom: Variants = fadeInSlide('up')

/** Slide in from left */
export const slideInFromLeft: Variants = fadeInSlide('right')

/** Slide in from right */
export const slideInFromRight: Variants = fadeInSlide('left')

/** Scale in */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: springPresets.gentle,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: easingPresets.fast / 1000, ease: easingPresets.easeIn },
  },
}

/** Scale out */
export const scaleOut: Variants = {
  hidden: { opacity: 1, scale: 1 },
  visible: { opacity: 1, scale: 1 },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: easingPresets.fast / 1000, ease: easingPresets.easeIn },
  },
}

/** Full page transition */
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      ...springPresets.default,
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: easingPresets.fast / 1000, ease: easingPresets.easeIn },
  },
}

/** Modal/dialog overlay fade */
export const modalOverlay: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: easingPresets.normal / 1000, ease: easingPresets.easeOut },
  },
  exit: {
    opacity: 0,
    transition: { duration: easingPresets.fast / 1000, ease: easingPresets.easeIn },
  },
}

/** Modal/dialog content */
export const modalContent: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springPresets.snappy,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: { duration: easingPresets.fast / 1000, ease: easingPresets.easeIn },
  },
}

/** Drawer slide from right */
export const drawerSlideFromRight: Variants = {
  hidden: { x: '100%' },
  visible: {
    x: 0,
    transition: springPresets.snappy,
  },
  exit: {
    x: '100%',
    transition: { duration: easingPresets.normal / 1000, ease: easingPresets.easeIn },
  },
}

/** Stagger container for list items */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
}

/** Individual stagger item (fade + slide up) */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: easingPresets.normal / 1000,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: easingPresets.fast / 1000, ease: easingPresets.easeIn },
  },
}

/** Skeleton shimmer pulse */
export const skeletonShimmer: Variants = {
  animate: {
    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
    transition: {
      duration: 1.5,
      ease: 'linear',
      repeat: Infinity,
    },
  },
}

/** Vinyl spin (continuous) */
export const vinylSpin: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 8,
      ease: 'linear',
      repeat: Infinity,
    },
  },
  paused: {
    rotate: 'var(--vinyl-rotation, 0deg)',
    transition: { duration: 0 },
  },
}

/** Pulse glow (for active elements) */
export const pulseGlow: Variants = {
  idle: {
    boxShadow: '0 0 0px rgba(30, 215, 96, 0)',
    transition: { duration: easingPresets.normal / 1000 },
  },
  active: {
    boxShadow: [
      '0 0 0px rgba(30, 215, 96, 0)',
      '0 0 20px rgba(30, 215, 96, 0.3)',
      '0 0 0px rgba(30, 215, 96, 0)',
    ],
    transition: {
      duration: 2,
      ease: 'easeInOut',
      repeat: Infinity,
      repeatType: 'loop',
    },
  },
}

/** Hover lift */
export const hoverLift: Variants = {
  rest: {
    y: 0,
    boxShadow: '0 1px 2px rgba(0,0,0,0.8)',
    transition: { duration: easingPresets.fast / 1000, ease: easingPresets.easeOut },
  },
  hover: {
    y: -4,
    boxShadow: '0 8px 32px rgba(0,0,0,0.95), 0 0 30px rgba(30,215,96,0.08)',
    transition: { duration: easingPresets.normal / 1000, ease: easingPresets.easeOut },
  },
}

/** Hover scale (subtle) */
export const hoverScale: Variants = {
  rest: {
    scale: 1,
    transition: { duration: easingPresets.fast / 1000, ease: easingPresets.easeOut },
  },
  hover: {
    scale: 1.05,
    transition: { duration: easingPresets.normal / 1000, ease: easingPresets.easeOut },
  },
}

/** Press feedback (scale down) */
export const pressFeedback: Variants = {
  rest: {
    scale: 1,
    transition: { duration: easingPresets.fast / 1000, ease: easingPresets.easeOut },
  },
  pressed: {
    scale: 0.97,
    transition: { duration: 100, ease: 'easeOut' },
  },
}

/** Heart/like animation (scale pop + color fill) */
export const heartPop: Variants = {
  idle: {
    scale: 1,
    color: 'var(--text-secondary)',
    transition: springPresets.gentle,
  },
  liked: {
    scale: [1, 1.3, 1],
    color: 'var(--accent)',
    transition: {
      duration: 0.4,
      ease: [0.34, 1.56, 0.64, 1],
    },
  },
}

/** Toast notification slide in */
export const toastSlideIn: Variants = {
  hidden: { opacity: 0, y: 50, x: '-50%', scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    x: '-50%',
    scale: 1,
    transition: springPresets.snappy,
  },
  exit: {
    opacity: 0,
    y: 20,
    x: '-50%',
    scale: 0.95,
    transition: { duration: easingPresets.fast / 1000, ease: easingPresets.easeIn },
  },
}

/** List reorder animation */
export const listReorder: Variants = {
  hidden: { opacity: 0, height: 0 },
  visible: {
    opacity: 1,
    height: 'auto',
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: { duration: easingPresets.fast / 1000 },
  },
}
