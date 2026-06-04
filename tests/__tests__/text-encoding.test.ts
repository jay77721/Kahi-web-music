import { describe, expect, test } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'

const SCAN_ROOTS = [
  'README.md',
  'app',
  'components',
  'docs',
  'hooks',
  'lib',
  'stores',
  'tests',
  'types',
]

const TEXT_EXTENSIONS = new Set(['.css', '.json', '.md', '.ts', '.tsx'])
const SKIP_DIRS = new Set(['.next', 'coverage', 'node_modules', 'playwright-report', 'test-results'])

const COMMON_MOJIBAKE = [
  ['replacement character', '\uFFFD'],
  ['mojibake: U+9225', '\u9225'],
  ['mojibake: U+922B', '\u922B'],
  ['mojibake: U+9352', '\u9352'],
  ['mojibake: U+6D93', '\u6D93'],
  ['mojibake: U+9427', '\u9427'],
] as const

function collectTextFiles(root: string): string[] {
  const absolute = join(process.cwd(), root)
  const stat = statSync(absolute)

  if (!stat.isDirectory()) {
    return TEXT_EXTENSIONS.has(extname(root)) ? [absolute] : []
  }

  return readdirSync(absolute).flatMap((entry) => {
    if (SKIP_DIRS.has(entry)) return []
    return collectTextFiles(join(root, entry))
  })
}

describe('text encoding', () => {
  test('source and docs do not contain common mojibake fragments', () => {
    const hits = SCAN_ROOTS.flatMap(collectTextFiles).flatMap((file) => {
      const content = readFileSync(file, 'utf8')
      return COMMON_MOJIBAKE.flatMap(([label, fragment]) => {
        if (!content.includes(fragment)) return []
        return `${file.replace(process.cwd(), '')}: ${label}`
      })
    })

    expect(hits).toEqual([])
  })
})
