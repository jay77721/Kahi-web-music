/**
 * Convert RGB triplet to hex string like "#1ed760".
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const to2 = (v: number): string => {
    const clamped = Math.max(0, Math.min(255, Math.round(v)))
    return clamped.toString(16).padStart(2, '0')
  }
  return `#${to2(r)}${to2(g)}${to2(b)}`
}

/**
 * Convert sRGB channel (0-255) to linear-light (0-1).
 * Required for the OKLCH conversion to be perceptually accurate.
 */
function srgbToLinear(channel: number): number {
  const c = channel / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

/**
 * sRGB → OKLab (Björn Ottosson's perceptual color space).
 * See: https://bottosson.github.io/posts/oklab/
 */
function srgbToOklab(r: number, g: number, b: number): { L: number; a: number; b: number } {
  const lr = srgbToLinear(r)
  const lg = srgbToLinear(g)
  const lb = srgbToLinear(b)

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb

  const l_ = Math.cbrt(l)
  const m_ = Math.cbrt(m)
  const s_ = Math.cbrt(s)

  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  }
}

/**
 * OKLab → OKLCH (polar form: lightness, chroma, hue).
 */
function oklabToOklch(oklab: { L: number; a: number; b: number }): { L: number; C: number; h: number } {
  const C = Math.sqrt(oklab.a * oklab.a + oklab.b * oklab.b)
  let h = (Math.atan2(oklab.b, oklab.a) * 180) / Math.PI
  if (h < 0) h += 360
  return { L: oklab.L, C, h }
}

/**
 * Convert sRGB (0-255) to an "oklch(L C h)" CSS string.
 * Lightness and chroma are rounded for compactness; hue is rounded to 1 decimal.
 */
export function rgbToOklch(r: number, g: number, b: number): string {
  const lab = srgbToOklab(r, g, b)
  const lch = oklabToOklch(lab)
  const L = lch.L.toFixed(3)
  const C = lch.C.toFixed(3)
  const H = lch.h.toFixed(1)
  return `oklch(${L} ${C} ${H})`
}

/**
 * Convert sRGB (0-255) to an "oklch(L C h / a)" CSS string with an explicit
 * alpha (0-1). Useful for translucent overlays, gradient stops, and any
 * context where the standard `rgbToOklch` would need post-processing.
 */
export function rgbToOklchWithAlpha(r: number, g: number, b: number, a: number): string {
  const lab = srgbToOklab(r, g, b)
  const lch = oklabToOklch(lab)
  const L = lch.L.toFixed(3)
  const C = lch.C.toFixed(3)
  const H = lch.h.toFixed(1)
  const clampedA = Math.max(0, Math.min(1, a))
  return `oklch(${L} ${C} ${H} / ${clampedA})`
}

export interface DominantColor {
  r: number
  g: number
  b: number
  hex: string
  oklch: string
}
