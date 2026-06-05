export type UnknownRecord = Record<string, unknown>

interface ReadFieldOptions {
  includeNull?: boolean
  maxDepth?: number
}

const DEFAULT_MAX_DEPTH = 5

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function responseLayers(raw: unknown, maxDepth = DEFAULT_MAX_DEPTH): unknown[] {
  const layers: unknown[] = []
  let current = raw

  for (let depth = 0; depth < maxDepth; depth += 1) {
    layers.push(current)

    if (!isRecord(current) || current.data === undefined || current.data === null) {
      break
    }

    current = current.data
  }

  return layers
}

export function readField<T = unknown>(
  raw: unknown,
  field: string,
  options: ReadFieldOptions = {}
): T | undefined {
  const { includeNull = false, maxDepth = DEFAULT_MAX_DEPTH } = options

  for (const layer of responseLayers(raw, maxDepth)) {
    if (!isRecord(layer) || !Object.prototype.hasOwnProperty.call(layer, field)) {
      continue
    }

    const value = layer[field]
    if (value === undefined || (value === null && !includeNull)) {
      continue
    }

    return value as T
  }

  return undefined
}

export function readFirstField<T = unknown>(
  raw: unknown,
  fields: readonly string[],
  options: ReadFieldOptions = {}
): T | undefined {
  for (const field of fields) {
    const value = readField<T>(raw, field, options)
    if (value !== undefined) return value
  }

  return undefined
}

export function firstRecord(raw: unknown): UnknownRecord | null {
  for (const layer of responseLayers(raw)) {
    if (isRecord(layer)) return layer
  }

  return null
}

export function findResponseLayer<T>(
  raw: unknown,
  predicate: (value: unknown) => value is T
): T | null {
  return responseLayers(raw).find(predicate) ?? null
}

export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

export function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}
