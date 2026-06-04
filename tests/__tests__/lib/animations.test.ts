import { describe, test, expect } from 'vitest'
import {
  fadeOutVariant,
  fadeIn,
  fadeInSlide,
  slideInFromTop,
  slideInFromBottom,
  slideInFromLeft,
  slideInFromRight,
  scaleIn,
  scaleOut,
  pageTransition,
  modalOverlay,
  modalContent,
  drawerSlideFromRight,
  staggerContainer,
  staggerItem,
  skeletonShimmer,
  vinylSpin,
  pulseGlow,
  hoverLift,
  hoverScale,
  pressFeedback,
  heartPop,
  toastSlideIn,
  listReorder,
} from '@/lib/animations'
import { springPresets, easingPresets } from '@/lib/spring-config'

describe('lib/animations', () => {
  describe('fadeOutVariant', () => {
    test('exposes hidden/visible/exit opacity values', () => {
      expect(fadeOutVariant.hidden).toEqual({ opacity: 0 })
      expect(fadeOutVariant.visible).toEqual({ opacity: 1 })
      expect(fadeOutVariant.exit).toEqual({ opacity: 0 })
    })
  })

  describe('fadeIn', () => {
    test('exposes all three states', () => {
      expect(fadeIn.hidden).toEqual({ opacity: 0 })
      expect(fadeIn.visible).toMatchObject({ opacity: 1 })
      expect(fadeIn.exit).toMatchObject({ opacity: 0 })
    })

    test('visible and exit use the easing presets', () => {
      const visible = fadeIn.visible as { transition: { ease: unknown } }
      const exit = fadeIn.exit as { transition: { ease: unknown } }
      expect(visible.transition.ease).toBe(easingPresets.easeOut)
      expect(exit.transition.ease).toBe(easingPresets.easeIn)
    })
  })

  describe('fadeInSlide', () => {
    test('uses y=20 for the default "up" direction', () => {
      const v = fadeInSlide()
      expect(v.hidden).toMatchObject({ opacity: 0, y: 20 })
      expect(v.exit).toMatchObject({ opacity: 0, y: 20 })
    })

    test('uses -y=20 for "down"', () => {
      const v = fadeInSlide('down')
      expect(v.hidden).toMatchObject({ y: -20 })
    })

    test('uses x=20 for "left"', () => {
      const v = fadeInSlide('left')
      expect(v.hidden).toMatchObject({ x: 20 })
    })

    test('uses -x=20 for "right"', () => {
      const v = fadeInSlide('right')
      expect(v.hidden).toMatchObject({ x: -20 })
    })

    test('visible state clears the offset to 0', () => {
      const v = fadeInSlide('up')
      expect(v.visible).toMatchObject({ opacity: 1, x: 0, y: 0 })
    })
  })

  describe('slide variants', () => {
    test('slideInFromTop is a "down" slide', () => {
      expect((slideInFromTop.hidden as { y?: number }).y).toBe(-20)
    })
    test('slideInFromBottom is an "up" slide', () => {
      expect((slideInFromBottom.hidden as { y?: number }).y).toBe(20)
    })
    test('slideInFromLeft is a "right" slide', () => {
      expect((slideInFromLeft.hidden as { x?: number }).x).toBe(-20)
    })
    test('slideInFromRight is a "left" slide', () => {
      expect((slideInFromRight.hidden as { x?: number }).x).toBe(20)
    })
  })

  describe('scaleIn / scaleOut', () => {
    test('scaleIn goes from 0.95 → 1 with the gentle spring', () => {
      expect(scaleIn.hidden).toMatchObject({ opacity: 0, scale: 0.95 })
      expect(scaleIn.visible).toMatchObject({ opacity: 1, scale: 1 })
      expect((scaleIn.visible as { transition: unknown }).transition).toBe(
        springPresets.gentle,
      )
    })

    test('scaleOut exits to 0.95', () => {
      expect(scaleOut.hidden).toMatchObject({ opacity: 1, scale: 1 })
      expect(scaleOut.exit).toMatchObject({ opacity: 0, scale: 0.95 })
    })
  })

  describe('pageTransition', () => {
    test('uses default spring and staggers children', () => {
      const t = (pageTransition.visible as { transition: { staggerChildren?: number; delayChildren?: number } }).transition
      expect(t.staggerChildren).toBe(0.05)
      expect(t.delayChildren).toBe(0.1)
    })
  })

  describe('modalOverlay / modalContent', () => {
    test('modalOverlay is a fade', () => {
      expect(modalOverlay.hidden).toEqual({ opacity: 0 })
      expect(modalOverlay.visible).toMatchObject({ opacity: 1 })
    })

    test('modalContent uses the snappy spring when entering', () => {
      const t = (modalContent.visible as { transition: unknown }).transition
      expect(t).toBe(springPresets.snappy)
    })
  })

  describe('drawerSlideFromRight', () => {
    test('slides from x=100% to 0', () => {
      expect(drawerSlideFromRight.hidden).toEqual({ x: '100%' })
      expect(drawerSlideFromRight.visible).toMatchObject({ x: 0 })
    })
  })

  describe('staggerContainer / staggerItem', () => {
    test('staggerContainer staggers children forward on enter and reverse on exit', () => {
      const enter = (staggerContainer.visible as { transition: { staggerChildren: number } }).transition
      const exit = (staggerContainer.exit as { transition: { staggerChildren: number; staggerDirection: number } }).transition
      expect(enter.staggerChildren).toBe(0.05)
      expect(exit.staggerChildren).toBe(0.03)
      expect(exit.staggerDirection).toBe(-1)
    })

    test('staggerItem lifts from y=12 to 0', () => {
      expect(staggerItem.hidden).toMatchObject({ opacity: 0, y: 12 })
      expect(staggerItem.visible).toMatchObject({ opacity: 1, y: 0 })
    })
  })

  describe('skeletonShimmer / vinylSpin', () => {
    test('skeletonShimmer animates background position infinitely', () => {
      const a = (skeletonShimmer.animate as { transition: { repeat: number; duration: number } }).transition
      expect(a.repeat).toBe(Infinity)
      expect(a.duration).toBe(1.5)
    })

    test('vinylSpin rotates 360° over 8s linearly and infinitely', () => {
      const a = (vinylSpin.animate as { rotate: number; transition: { duration: number; repeat: number; ease: string } }).transition
      expect(vinylSpin.animate).toMatchObject({ rotate: 360 })
      expect(a.duration).toBe(8)
      expect(a.repeat).toBe(Infinity)
      expect(a.ease).toBe('linear')
    })

    test('vinylSpin.paused stops rotation', () => {
      const p = (vinylSpin.paused as { rotate: string }).rotate
      expect(p).toContain('var(--vinyl-rotation')
    })
  })

  describe('pulseGlow', () => {
    test('pulseGlow has idle and active states', () => {
      expect(pulseGlow.idle).toMatchObject({ boxShadow: expect.any(String) })
      const active = (pulseGlow.active as { boxShadow: string[]; transition: { duration: number; repeat: number } })
      expect(Array.isArray(active.boxShadow)).toBe(true)
      expect(active.boxShadow.length).toBeGreaterThanOrEqual(3)
      expect(active.transition.repeat).toBe(Infinity)
    })
  })

  describe('hover / press feedback', () => {
    test('hoverLift moves y to -4 on hover', () => {
      expect((hoverLift.hover as { y: number }).y).toBe(-4)
    })

    test('hoverScale grows to 1.05 on hover', () => {
      expect((hoverScale.hover as { scale: number }).scale).toBe(1.05)
    })

    test('pressFeedback shrinks to 0.97', () => {
      expect((pressFeedback.pressed as { scale: number }).scale).toBe(0.97)
    })
  })

  describe('heartPop', () => {
    test('uses the accent color when liked', () => {
      const liked = (heartPop.liked as { color: string }).color
      expect(liked).toContain('--accent')
    })
  })

  describe('toastSlideIn', () => {
    test('centers the toast with -50% x and y=50 → 0', () => {
      expect(toastSlideIn.hidden).toMatchObject({ opacity: 0, y: 50, x: '-50%' })
      expect(toastSlideIn.visible).toMatchObject({ opacity: 1, y: 0, x: '-50%' })
    })
  })

  describe('listReorder', () => {
    test('animates height between 0 and "auto"', () => {
      expect(listReorder.hidden).toMatchObject({ opacity: 0, height: 0 })
      expect(listReorder.visible).toMatchObject({ opacity: 1, height: 'auto' })
    })
  })
})
