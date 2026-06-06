export type Easing = string | readonly [number, number, number, number]

export type Transition = {
  type?: 'spring' | 'tween' | string
  stiffness?: number
  damping?: number
  mass?: number
  duration?: number
  ease?: Easing
  repeat?: number
  repeatType?: 'loop' | 'reverse' | 'mirror' | string
  staggerChildren?: number
  staggerDirection?: number
  delayChildren?: number
}

/**
 * Consistent spring physics presets for natural-feeling animations.
 * All springs use damping/mass/stiffness for predictable behavior.
 */
export const springPresets = {
  /** Default spring - balanced feel */
  default: {
    type: 'spring',
    stiffness: 300,
    damping: 30,
    mass: 0.8,
  } as Transition,

  /** Gentle spring - subtle, soft feel */
  gentle: {
    type: 'spring',
    stiffness: 200,
    damping: 25,
    mass: 0.6,
  } as Transition,

  /** Snappy spring - responsive, quick feel */
  snappy: {
    type: 'spring',
    stiffness: 400,
    damping: 35,
    mass: 0.6,
  } as Transition,

  /** Bouncy spring - playful, noticeable bounce */
  bouncy: {
    type: 'spring',
    stiffness: 300,
    damping: 15,
    mass: 0.8,
  } as Transition,

  /** Slow spring - deliberate, elegant feel */
  slow: {
    type: 'spring',
    stiffness: 150,
    damping: 20,
    mass: 0.8,
  } as Transition,
} as const

/**
 * Consistent easing curves for tween animations (when spring isn't appropriate).
 */
export const easingPresets = {
  /** Standard material design ease */
  easeInOut: [0.4, 0, 0.2, 1] as Easing,

  /** Smooth deceleration */
  easeOut: [0, 0, 0.2, 1] as Easing,

  /** Sharp acceleration */
  easeIn: [0.4, 0, 1, 1] as Easing,

  /** Exponential deceleration */
  expoOut: [0.16, 1, 0.3, 1] as Easing,

  /** Standard duration presets */
  fast: 150,
  normal: 300,
  slow: 400,
} as const

/**
 * Shared transition configuration for fade effects.
 */
export const fadeTransition = (duration = easingPresets.normal): Transition => ({
  duration: duration / 1000,
  ease: easingPresets.easeInOut,
})

/**
 * Shared transition configuration for slide effects.
 */
export const slideTransition = (_duration = easingPresets.slow): Transition => ({
  duration: _duration / 1000,
  ease: easingPresets.expoOut,
})

/**
 * Default exit transition (fade out + slight scale down).
 */
export const exitTransition: Transition = {
  duration: easingPresets.fast / 1000,
  ease: easingPresets.easeIn,
}

/**
 * Layout transition for shared elements.
 */
export const layoutTransition: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
  mass: 0.8,
}
