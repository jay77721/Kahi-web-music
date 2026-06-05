import { NextRequest } from 'next/server'

type RateLimitBucket = {
  count: number
  resetAt: number
}

export interface RateLimitResult {
  limited: boolean
  retryAfterSeconds?: number
}

interface RateLimiterOptions {
  windowMs: number
  maxRequests: number
  getKey?: (request: NextRequest) => string
}

export function getTrustedClientRateLimitKey(request: NextRequest): string {
  return request.headers.get('x-vercel-forwarded-for') || 'unknown'
}

export function createRateLimiter(options: RateLimiterOptions) {
  const buckets = new Map<string, RateLimitBucket>()
  const getKey = options.getKey ?? getTrustedClientRateLimitKey
  let lastPruneAt = 0

  function pruneExpiredBuckets(now: number): void {
    if (now - lastPruneAt < options.windowMs) {
      return
    }

    lastPruneAt = now
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) {
        buckets.delete(key)
      }
    }
  }

  return {
    check(request: NextRequest, keySuffix?: string): RateLimitResult {
      const now = Date.now()
      pruneExpiredBuckets(now)

      const baseKey = getKey(request)
      const key = keySuffix ? `${baseKey}:${keySuffix}` : baseKey
      const bucket = buckets.get(key)
      if (!bucket || bucket.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + options.windowMs })
        return { limited: false }
      }

      if (bucket.count >= options.maxRequests) {
        return {
          limited: true,
          retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
        }
      }

      buckets.set(key, { ...bucket, count: bucket.count + 1 })
      return { limited: false }
    },
  }
}
