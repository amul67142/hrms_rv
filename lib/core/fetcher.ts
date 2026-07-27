/**
 * Resilient fetch helpers.
 *
 * The database lives in Tokyo, so responses are sometimes slow and occasionally
 * a pooled connection is dropped mid-flight. A bare `fetch()` with no timeout or
 * retry surfaces those as a hard "failed to fetch" to the user.
 *
 * `apiFetch` is a DROP-IN replacement for `fetch`: it returns a real `Response`,
 * so every existing `.ok` / `.status` / `.json()` / `.blob()` call keeps working
 * unchanged. It just adds, transparently:
 *   - an abort timeout (default 30s) instead of hanging forever,
 *   - automatic retry with backoff on transient failures (network error /
 *     502 / 503 / 504) — but ONLY for idempotent methods (GET/HEAD), never for
 *     POST/PUT/PATCH/DELETE, so writes are never accidentally duplicated.
 *
 * `fetchJson<T>` is a thin convenience wrapper for the common
 * "fetch → parse JSON → throw on error" pattern.
 *
 * Not marked 'use client' on purpose, so it can be imported from anywhere.
 */

export type ApiFetchInit = RequestInit & {
  /** Abort the request after this many ms (default 30000). */
  timeoutMs?: number
  /** Extra retry attempts for idempotent requests (default 2). */
  retries?: number
  /** HTTP statuses that trigger a retry (default 502/503/504). */
  retryOn?: number[]
}

const DEFAULT_TIMEOUT_MS = 30_000
const DEFAULT_RETRIES = 2
const DEFAULT_RETRY_ON = [502, 503, 504]

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

/** Drop-in `fetch` with timeout + retry. Returns a real `Response`. */
export async function apiFetch(input: string, init: ApiFetchInit = {}): Promise<Response> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
    retryOn = DEFAULT_RETRY_ON,
    ...rest
  } = init

  const method = (rest.method || 'GET').toUpperCase()
  // Only ever retry safe/idempotent methods — never replay a write.
  const canRetry = method === 'GET' || method === 'HEAD'
  const maxAttempts = canRetry ? retries + 1 : 1

  let lastError: unknown

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(input, { ...rest, signal: controller.signal })
      clearTimeout(timer)

      if (canRetry && retryOn.includes(res.status) && attempt < maxAttempts - 1) {
        await sleep(300 * 2 ** attempt) // 300ms, 600ms, 1.2s...
        continue
      }
      return res
    } catch (err) {
      clearTimeout(timer)
      lastError = err
      if (canRetry && attempt < maxAttempts - 1) {
        await sleep(300 * 2 ** attempt)
        continue
      }
      throw err
    }
  }

  throw lastError
}

export class HttpError extends Error {
  status: number
  body: unknown
  constructor(status: number, body: unknown) {
    super(`Request failed with status ${status}`)
    this.name = 'HttpError'
    this.status = status
    this.body = body
  }
}

/** Fetch + parse JSON, throwing `HttpError` on a non-2xx response. */
export async function fetchJson<T = unknown>(input: string, init: ApiFetchInit = {}): Promise<T> {
  const res = await apiFetch(input, init)
  const data = (await res.json()) as T
  if (!res.ok) {
    throw new HttpError(res.status, data)
  }
  return data
}
