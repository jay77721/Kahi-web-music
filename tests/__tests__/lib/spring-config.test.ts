import { describe, test, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  springPresets,
  easingPresets,
  fadeTransition,
  slideTransition,
  exitTransition,
  layoutTransition,
} from '@/lib/spring-config'

describe('lib/spring-config', () => {
  test('defines lightweight local animation types without external imports', () => {
    const source = readFileSync(join(process.cwd(), 'lib/spring-config.ts'), 'utf8')
    expect(source).not.toContain('framer-motion')
    expect(source).toContain('export type Transition')
    expect(source).toContain('export type Easing')
  })

  describe('springPresets', () => {
    test('contains all named presets', () => {
      expect(Object.keys(springPresets)).toEqual(
        expect.arrayContaining(['default', 'gentle', 'snappy', 'bouncy', 'slow']),
      )
    })

    test('every preset is a spring transition with type="spring"', () => {
      for (const preset of Object.values(springPresets)) {
        expect(preset.type).toBe('spring')
      }
    })

    test('all presets have stiffness/damping/mass numbers', () => {
      for (const preset of Object.values(springPresets)) {
        expect(typeof preset.stiffness).toBe('number')
        expect(typeof preset.damping).toBe('number')
        expect(typeof preset.mass).toBe('number')
        expect(preset.stiffness).toBeGreaterThan(0)
        expect(preset.damping).toBeGreaterThan(0)
        expect(preset.mass).toBeGreaterThan(0)
      }
    })

    test('presets use distinct stiffness values', () => {
      // The presets should be tunable independently, so stiffness must
      // differ between at least some of them.
      const stiffnesses = new Set(
        Object.values(springPresets).map((p) => p.stiffness),
      )
      expect(stiffnesses.size).toBeGreaterThan(1)
    })
  })

  describe('easingPresets', () => {
    test('contains the named easing curves', () => {
      expect(easingPresets.easeInOut).toEqual([0.4, 0, 0.2, 1])
      expect(easingPresets.easeOut).toEqual([0, 0, 0.2, 1])
      expect(easingPresets.easeIn).toEqual([0.4, 0, 1, 1])
      expect(easingPresets.expoOut).toEqual([0.16, 1, 0.3, 1])
    })

    test('contains duration presets in milliseconds', () => {
      expect(easingPresets.fast).toBe(150)
      expect(easingPresets.normal).toBe(300)
      expect(easingPresets.slow).toBe(400)
    })
  })

  describe('fadeTransition', () => {
    test('uses easeInOut by default', () => {
      const t = fadeTransition()
      expect(t.ease).toBe(easingPresets.easeInOut)
    })

    test('converts milliseconds to seconds', () => {
      const t = fadeTransition(300)
      expect(t.duration).toBeCloseTo(0.3)
    })
  })

  describe('slideTransition', () => {
    test('uses expoOut easing', () => {
      const t = slideTransition()
      expect(t.ease).toBe(easingPresets.expoOut)
    })
  })

  describe('exitTransition', () => {
    test('is fast with easeIn', () => {
      expect(exitTransition.duration).toBeCloseTo(0.15)
      expect(exitTransition.ease).toBe(easingPresets.easeIn)
    })
  })

  describe('layoutTransition', () => {
    test('matches the default spring', () => {
      expect(layoutTransition).toEqual(springPresets.default)
    })
  })
})
