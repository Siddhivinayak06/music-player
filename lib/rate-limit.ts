/**
 * In-memory rate limiter for API routes.
 *
 * Uses a sliding-window strategy per IP address. This is suitable for
 * single-instance deployments. For multi-instance, replace with a
 * Redis-backed implementation.
 *
 * Usage:
 *   const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 5 })
 *   if (limiter.isRateLimited(ip)) return NextResponse.json(...)
 */

interface RateLimitEntry {
  timestamps: number[]
}

interface RateLimiterOptions {
  /** Time window in milliseconds */
  windowMs: number
  /** Maximum requests allowed within the window */
  maxRequests: number
}

const stores = new Map<string, Map<string, RateLimitEntry>>()

export function createRateLimiter(options: RateLimiterOptions) {
  const { windowMs, maxRequests } = options

  // Each limiter gets its own isolated store
  const id = `${windowMs}-${maxRequests}-${Date.now()}`
  const store = new Map<string, RateLimitEntry>()
  stores.set(id, store)

  // Periodic cleanup to prevent memory leaks
  const cleanup = () => {
    const now = Date.now()
    for (const [key, entry] of store.entries()) {
      entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs)
      if (entry.timestamps.length === 0) {
        store.delete(key)
      }
    }
  }

  // Clean up every 60 seconds
  if (typeof setInterval !== 'undefined') {
    setInterval(cleanup, 60_000)
  }

  return {
    /**
     * Check if a given key (usually an IP) has exceeded the rate limit.
     * Also records the current request.
     */
    isRateLimited(key: string): boolean {
      const now = Date.now()
      let entry = store.get(key)

      if (!entry) {
        entry = { timestamps: [] }
        store.set(key, entry)
      }

      // Remove timestamps outside the window
      entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs)

      if (entry.timestamps.length >= maxRequests) {
        return true
      }

      entry.timestamps.push(now)
      return false
    },

    /**
     * Get remaining requests for a key.
     */
    remaining(key: string): number {
      const now = Date.now()
      const entry = store.get(key)
      if (!entry) return maxRequests

      const recent = entry.timestamps.filter((t) => now - t < windowMs)
      return Math.max(0, maxRequests - recent.length)
    },

    /**
     * Get the time (in ms) until the rate limit resets for a key.
     */
    resetIn(key: string): number {
      const entry = store.get(key)
      if (!entry || entry.timestamps.length === 0) return 0

      const oldest = Math.min(...entry.timestamps)
      return Math.max(0, windowMs - (Date.now() - oldest))
    },
  }
}

/**
 * Pre-configured rate limiters for common use cases.
 */

/** Auth endpoints: 5 attempts per 60 seconds per IP */
export const authLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 5,
})

/** General API: 60 requests per 60 seconds per IP */
export const apiLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 60,
})
