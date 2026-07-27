/**
 * Tiny in-process TTL cache.
 *
 * Safe here because the app runs as ONE long-lived Node process (server.js),
 * not serverless — so a module-level Map persists across requests. Use it to
 * avoid re-querying the (far-away, Tokyo) database for data that changes
 * rarely: departments, holidays, company settings, employee dropdown lists,
 * dashboard aggregates, etc.
 *
 * This is deliberately simple (no LRU eviction) — HRMS cache keys are few and
 * bounded. Every entry has a TTL so nothing goes stale forever.
 */

type Entry<T> = { value: T; expiresAt: number }

const store = new Map<string, Entry<unknown>>()

/**
 * Get a cached value, or compute + store it. Concurrent callers for the same
 * key share a single in-flight promise (dedupes the thundering-herd on expiry).
 */
const inflight = new Map<string, Promise<unknown>>()

export async function cached<T>(
  key: string,
  ttlMs: number,
  compute: () => Promise<T>
): Promise<T> {
  const now = Date.now()
  const hit = store.get(key) as Entry<T> | undefined
  if (hit && hit.expiresAt > now) {
    return hit.value
  }

  // De-duplicate concurrent recomputes for the same key.
  const existing = inflight.get(key) as Promise<T> | undefined
  if (existing) return existing

  const promise = (async () => {
    try {
      const value = await compute()
      store.set(key, { value, expiresAt: Date.now() + ttlMs })
      return value
    } finally {
      inflight.delete(key)
    }
  })()

  inflight.set(key, promise)
  return promise
}

/** Invalidate one key or every key beginning with `prefix` (call after writes). */
export function invalidate(keyOrPrefix: string, prefix = false): void {
  if (!prefix) {
    store.delete(keyOrPrefix)
    return
  }
  for (const k of store.keys()) {
    if (k.startsWith(keyOrPrefix)) store.delete(k)
  }
}

/**
 * Call after any create/update/delete of an employee. Clears the derived caches
 * that depend on the employee set: the active-employee dropdown, department
 * head-counts, and the dashboard summary. Keep this in one place so every write
 * path stays consistent.
 */
export function invalidateEmployeeCaches(): void {
  invalidate('employees:activeList')
  invalidate('departments:withCounts')
  invalidate('dashboard:summary')
  invalidate('orgchart:all')
}

/** Common TTLs, tuned to how often each kind of data actually changes. */
export const TTL = {
  short: 15_000, // 15s — dashboards, "today" views
  medium: 60_000, // 1m — lists that change during the day
  long: 10 * 60_000, // 10m — departments, holidays, company settings
} as const
