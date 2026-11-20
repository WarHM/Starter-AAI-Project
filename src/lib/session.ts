// The session: one signed cookie, no server-side session table
// (design rules 6–7). The cookie holds { userId, role, exp } and is
// HMAC-SHA256-signed with SESSION_SECRET; any edit breaks the signature.

import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

export const SESSION_COOKIE = 'session'
export const SESSION_MAX_AGE_SECONDS = 30 * 60 // 30 minutes idle, sliding

export type Role = 'Employee' | 'Supervisor' | 'HR' | 'Admin'

export type SessionPayload = {
  userId: number
  role: Role
  exp: number // epoch milliseconds
}

// Rule 8: role decides the home page. Lives here (pure module) so the
// proxy and the server side share one source of truth.
export const HOME_BY_ROLE: Record<Role, string> = {
  Employee: '/employee',
  Supervisor: '/supervisor',
  HR: '/hr',
  Admin: '/admin',
}

// Reverse map: the role a protected route belongs to.
export const ROLE_BY_HOME: Record<string, Role> = {
  '/employee': 'Employee',
  '/supervisor': 'Supervisor',
  '/hr': 'HR',
  '/admin': 'Admin',
}

function signingSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    throw new Error('SESSION_SECRET is not set — copy .env.example to .env')
  }
  return secret
}

function sign(body: string): string {
  return createHmac('sha256', signingSecret()).update(body).digest('base64url')
}

export function newSessionPayload(userId: number, role: Role): SessionPayload {
  return {
    userId,
    role,
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  }
}

export function createSessionToken(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${body}.${sign(body)}`
}

/** Returns the payload when the cookie is genuinely ours and not expired. */
export function verifySessionToken(
  token: string | undefined | null,
): SessionPayload | null {
  if (!token) return null
  const [body, signature] = token.split('.')
  if (!body || !signature) return null

  const expected = Buffer.from(sign(body))
  const given = Buffer.from(signature)
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return null
  }

  try {
    const payload = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8'),
    ) as SessionPayload
    if (
      typeof payload.userId !== 'number' ||
      typeof payload.role !== 'string' ||
      typeof payload.exp !== 'number' ||
      payload.exp < Date.now()
    ) {
      return null
    }
    return payload
  } catch {
    return null
  }
}

// Cookie read/write. `set` and `delete` may only run in Server Functions
// (the login/logout actions); `get` also works in Server Components.

export async function issueSessionCookie(payload: SessionPayload): Promise<void> {
  const store = await cookies()
  store.set(SESSION_COOKIE, createSessionToken(payload), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === 'production',
  })
}

export async function readSessionCookie(): Promise<SessionPayload | null> {
  const store = await cookies()
  return verifySessionToken(store.get(SESSION_COOKIE)?.value)
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}
