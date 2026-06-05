const DEV_API_BASE = 'http://localhost:3000'

export function resolveNcmApiBase(): string | null {
  if (process.env.API_URL) {
    return process.env.API_URL
  }

  if (process.env.NODE_ENV !== 'production') {
    return DEV_API_BASE
  }

  return null
}
