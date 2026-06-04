import { describe, expect, test } from 'vitest'
import { rgbToHex, rgbToOklch, rgbToOklchWithAlpha } from '@/lib/color'

describe('color utilities', () => {
  describe('rgbToHex', () => {
    test('converts black and white', () => {
      expect(rgbToHex(0, 0, 0)).toBe('#000000')
      expect(rgbToHex(255, 255, 255)).toBe('#ffffff')
    })

    test('rounds and clamps channel values', () => {
      expect(rgbToHex(-10, 127.6, 300)).toBe('#0080ff')
    })

    test('pads single-digit hex channels', () => {
      expect(rgbToHex(1, 10, 15)).toBe('#010a0f')
    })
  })

  describe('rgbToOklch', () => {
    test('returns CSS oklch string for black and white', () => {
      expect(rgbToOklch(0, 0, 0)).toBe('oklch(0.000 0.000 0.0)')
      expect(rgbToOklch(255, 255, 255)).toMatch(/^oklch\(1\.000 0\.000/)
    })

    test('returns stable values for greys', () => {
      expect(rgbToOklch(128, 128, 128)).toBe('oklch(0.600 0.000 89.9)')
    })

    test('returns a hue-bearing value for accent green', () => {
      expect(rgbToOklch(30, 215, 96)).toBe('oklch(0.770 0.212 148.7)')
    })
  })

  describe('rgbToOklchWithAlpha', () => {
    test('includes explicit alpha', () => {
      expect(rgbToOklchWithAlpha(30, 215, 96, 0.5)).toBe(
        'oklch(0.770 0.212 148.7 / 0.5)'
      )
    })

    test('clamps alpha to 0..1', () => {
      expect(rgbToOklchWithAlpha(0, 0, 0, -1)).toBe('oklch(0.000 0.000 0.0 / 0)')
      expect(rgbToOklchWithAlpha(0, 0, 0, 2)).toBe('oklch(0.000 0.000 0.0 / 1)')
    })
  })
})
