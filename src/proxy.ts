// Next.js 16 renamed middleware to proxy — this file runs before a page
// renders (fast gate only). Pages and server actions re-check the session
// themselves (design rule 9), so bypassing this gate buys an attacker
// nothing.
//
// AC-05, AC-06, AC-09, AC-10: sends logged-out visitors to /login, bounces
// wrong-role users to their own home, and reissues the cookie on every page
// load so 30 minutes of *idleness* (not age) ends the session.

import { NextResponse, type NextRequest } from 'next/server'
import {
  HOME_BY_ROLE,
  ROLE_BY_HOME,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  verifySessionToken,
} from './lib/session'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const payload = verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
  )

  // Signpost: logged in → own home; logged out → /login.
  if (pathname === '/') {
    return NextResponse.redirect(
      new URL(payload ? HOME_BY_ROLE[payload.role] : '/login', request.url),
    )
  }

  if (!payload) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Wrong role for the route → bounce to their own home (AC-10).
  const requiredRole = ROLE_BY_HOME[pathname]
  if (requiredRole && payload.role !== requiredRole) {
    return NextResponse.redirect(
      new URL(HOME_BY_ROLE[payload.role], request.url),
    )
  }

  // Valid session: reissue the cookie with a fresh 30-minute expiry.
  const response = NextResponse.next()
  response.cookies.set(SESSION_COOKIE, createSessionToken(payload), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === 'production',
  })
  return response
}

export const config = {
  // Guard everything except the login page itself and Next internals.
  matcher: ['/', '/employee/:path*', '/supervisor/:path*', '/hr/:path*', '/admin/:path*'],
}
