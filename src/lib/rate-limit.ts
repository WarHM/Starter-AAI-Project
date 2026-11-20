// In-memory failed-login counter (design rule 4): 10 failed attempts per
// 15 minutes, counted per email address AND per IP. Lives in the server's
// memory only — a restart clears it, which is fine for a single-laptop demo.

const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 10

// Kept on globalThis so `next dev` re-compiles don't wipe the counter
// (same pattern as lib/db.ts). Server restart still clears it.
const globalForRateLimit = globalThis as unknown as {
  failedAttempts?: Map<string, number[]>
}

const failedAttempts: Map<string, number[]> =
  globalForRateLimit.failedAttempts ?? new Map<string, number[]>()

globalForRateLimit.failedAttempts = failedAttempts

function keysFor(email: string, ip: string): string[] {
  return [`email:${email}`, `ip:${ip}`]
}

function recent(key: string, now: number): number[] {
  const list = (failedAttempts.get(key) ?? []).filter(
    (t) => now - t < WINDOW_MS,
  )
  if (list.length === 0) {
    failedAttempts.delete(key)
  } else {
    failedAttempts.set(key, list)
  }
  return list
}

/** True while this email or this IP is inside its cool-down window. */
export function isRateLimited(email: string, ip: string): boolean {
  const now = Date.now()
  return keysFor(email, ip).some(
    (key) => recent(key, now).length >= MAX_ATTEMPTS,
  )
}

/** Call once per failed credential check — not for empty/format errors. */
export function recordFailedAttempt(email: string, ip: string): void {
  const now = Date.now()
  for (const key of keysFor(email, ip)) {
    const list = (failedAttempts.get(key) ?? []).filter(
      (t) => now - t < WINDOW_MS,
    )
    list.push(now)
    failedAttempts.set(key, list)
  }
}

export const RATE_LIMIT_MESSAGE =
  'Too many failed attempts — try again in 15 minutes'
