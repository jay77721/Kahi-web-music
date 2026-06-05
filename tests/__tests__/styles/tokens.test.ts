/**
 * tokens.css structural test
 *
 * Verifies that the centralized design-token file contains the expected
 * categories and individual tokens. The test reads tokens.css as text so
 * it does not depend on PostCSS / Tailwind processing — we only assert
 * that the names are present and not duplicated.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const TOKENS_PATH = resolve(__dirname, '../../../styles/tokens.css')
const STYLE_PATHS = [
  resolve(__dirname, '../../../app/globals.css'),
  resolve(__dirname, '../../../styles/cards.css'),
  resolve(__dirname, '../../../styles/layout.css'),
  resolve(__dirname, '../../../styles/player.css'),
  TOKENS_PATH,
] as const

const LOGIN_PAGE_COLOR_TOKENS = [
  '--bg-primary',
  '--bg-secondary',
  '--bg-surface',
  '--bg-elevated',
  '--bg-hover',
  '--text-primary',
  '--text-secondary',
  '--text-tertiary',
  '--accent',
  '--accent-hover',
  '--accent-foreground',
  '--accent-glow',
  '--border',
  '--border-strong',
  '--shadow-lg',
] as const

// Tokens that MUST exist in tokens.css. Grouped by category to keep
// failure messages actionable — if one drops, the category header shows
// the developer where to re-add it.
const REQUIRED_TOKENS = {
  background: [
    '--bg-primary',
    '--bg-secondary',
    '--bg-surface',
    '--bg-elevated',
    '--bg-overlay',
    '--bg-hover',
    '--bg-active',
    '--bg-accent-subtle',
    '--bg-accent-hover',
  ],
  text: [
    '--text-primary',
    '--text-secondary',
    '--text-tertiary',
    '--text-quaternary',
    '--text-inverse',
  ],
  accent: ['--accent', '--accent-hover', '--accent-foreground', '--accent-glow', '--accent-subtle'],
  border: ['--border', '--border-subtle', '--border-light', '--border-strong', '--border-accent'],
  spacing: ['--space-xs', '--space-sm', '--space-md', '--space-lg', '--space-xl'],
  radius: [
    '--radius-xs',
    '--radius-sm',
    '--radius-md',
    '--radius-lg',
    '--radius-xl',
    '--radius-2xl',
    '--radius-full',
  ],
  shadow: [
    '--shadow-xs',
    '--shadow-sm',
    '--shadow-md',
    '--shadow-lg',
    '--shadow-xl',
    '--shadow-glow',
    '--shadow-glow-lg',
  ],
  easing: ['--ease-in-out', '--ease-out', '--ease-out-expo', '--ease-spring'],
  duration: ['--duration-fast', '--duration-normal', '--duration-slow'],
  transition: [
    '--transition-fast',
    '--transition-normal',
    '--transition-slow',
    '--transition-spring',
  ],
  zIndex: ['--z-base', '--z-sticky', '--z-overlay', '--z-player', '--z-modal', '--z-toast'],
  font: ['--font-sans', '--font-display', '--font-mono'],
  layout: ['--hero-height', '--vinyl-size', '--player-bar-height'],
} as const satisfies Record<string, readonly string[]>

describe('styles/tokens.css', () => {
  // Arrange: load the file once for the whole suite.
  const exists = existsSync(TOKENS_PATH)
  const source = exists ? readFileSync(TOKENS_PATH, 'utf-8') : ''

  it('is located at styles/tokens.css', () => {
    // Act + Assert
    expect(exists).toBe(true)
  })

  it('is imported by app/globals.css', () => {
    const globalsPath = resolve(__dirname, '../../../app/globals.css')
    const globals = existsSync(globalsPath) ? readFileSync(globalsPath, 'utf-8') : ''

    // Assert: the import statement must reference tokens.css.
    expect(globals).toMatch(/@import\s+["'][^"']*tokens\.css["']/)
  })

  describe('required design tokens are present', () => {
    // Iterate each category and assert every name is declared at least
    // once. We do NOT assert "exactly once" because some tokens (e.g.
    // --radius-sm) intentionally appear in BOTH the Tailwind v4 @theme
    // block (as rem values for utility classes) and the :root block (as
    // px values for `var()` references). The dual declaration is by
    // design.
    for (const [category, tokens] of Object.entries(REQUIRED_TOKENS)) {
      describe(`category: ${category}`, () => {
        for (const token of tokens) {
          it(`declares ${token}`, () => {
            // Regex matches the token as a custom property declaration.
            // The `\b` word boundary prevents matching e.g. `--bg-primary-foo`.
            const declaration = new RegExp(`${token}\\s*:`)
            expect(source, `${token} should be declared in tokens.css`).toMatch(declaration)
          })
        }
      })
    }
  })

  it('exposes tokens.css via the @theme block (Tailwind v4 utilities)', () => {
    // Act + Assert: the @theme directive is processed by Tailwind at build time.
    expect(source).toMatch(/@theme\s*\{/)
    expect(source).toMatch(/--color-accent:\s*var\(--accent\)/i)
    expect(source).toMatch(/--color-foreground:\s*var\(--text-primary\)/i)
  })

  it('light theme overrides every color token used by the login page', () => {
    const lightThemeBlock = source.match(/\[data-theme="light"\]\s*\{([\s\S]*?)\n\}/)?.[1] ?? ''

    for (const token of LOGIN_PAGE_COLOR_TOKENS) {
      const declaration = new RegExp(`${token}\\s*:`)
      expect(lightThemeBlock, `${token} should be overridden in [data-theme="light"]`).toMatch(declaration)
    }
  })

  it('keeps the @theme and :root blocks organized with section headers', () => {
    // Assert: the file should be scannable. Every category above should
    // have a visible "── <Category> ──" comment, except @theme which is
    // an opening block. We check a few representative ones.
    expect(source).toMatch(/Backgrounds/i)
    expect(source).toMatch(/Foreground\s*\/\s*text/i)
    expect(source).toMatch(/Brand\s*\/\s*accent/i)
    expect(source).toMatch(/Easings/i)
    expect(source).toMatch(/Z-index/i)
  })

  it('does not append a second easing to composite transition tokens', () => {
    const duplicateTransitionPattern = /var\(--transition-[^)]+\)\s+var\(--ease-[^)]+\)/

    for (const stylePath of STYLE_PATHS) {
      const styleSource = existsSync(stylePath) ? readFileSync(stylePath, 'utf-8') : ''
      expect(styleSource, `${stylePath} should use --duration-* when overriding easing`).not.toMatch(
        duplicateTransitionPattern
      )
    }
  })
})
