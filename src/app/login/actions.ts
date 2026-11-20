'use server'

import { compare } from 'bcryptjs'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { HOME_BY_ROLE } from '@/lib/auth'
import {
  isRateLimited,
  recordFailedAttempt,
  RATE_LIMIT_MESSAGE,
} from '@/lib/rate-limit'
import {
  clearSessionCookie,
  issueSessionCookie,
  newSessionPayload,
  type Role,
} from '@/lib/session'
import { isValidEmail } from '@/lib/validation'

export type LoginState = {
  error?: string
  rateLimited?: boolean
}

export async function login(
  _previous: LoginState | undefined,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const password = String(formData.get('password') ?? '')

  if (!isValidEmail(email)) {
    return { error: 'Enter a valid email address ending in @budiman.com' }
  }

  // Checked before any credential work, so the correct password is also
  // refused inside the window (AC-08, design rule 4).
  const head = await headers()
  const ip =
    head.get('x-forwarded-for')?.split(',')[0].trim() ||
    head.get('x-real-ip') ||
    'local'
  if (isRateLimited(email, ip)) {
    return { error: RATE_LIMIT_MESSAGE, rateLimited: true }
  }

  const user = await prisma.user.findUnique({ where: { email } })
  const passwordOk =
    user !== null && (await compare(password, user.passwordHash))

  if (!user || !passwordOk) {
    // One generic message for both failures — never say which part was
    // wrong (AC-02, AC-03, design rule 3).
    recordFailedAttempt(email, ip)
    return { error: 'Invalid email or password' }
  }

  await issueSessionCookie(newSessionPayload(user.id, user.role as Role))
  redirect(HOME_BY_ROLE[user.role as Role])
}

/**
 * Ends the session (AC-07, design rule 10): clears the cookie and shows
 * the "You are logged out" message on /login. Every role page re-checks
 * the session, so the Back button cannot revive it.
 */
export async function logout(): Promise<void> {
  await clearSessionCookie()
  redirect('/login?loggedOut=1')
}
