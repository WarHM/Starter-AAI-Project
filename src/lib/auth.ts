// Server-side "who is using the app right now" (design rule 9).
// The cookie is a convenience; the database is the truth.

import { redirect } from 'next/navigation'
import { prisma } from './db'
import { HOME_BY_ROLE, readSessionCookie, type Role } from './session'

export { HOME_BY_ROLE } from './session'

export type SessionUser = {
  id: number
  name: string
  email: string
  role: Role
  division: string
  designation: string
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const payload = await readSessionCookie()
  if (!payload) return null

  const user = await prisma.user.findUnique({ where: { id: payload.userId } })
  if (!user) return null
  if (user.role !== payload.role) return null // role must match the database

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    division: user.division,
    designation: user.designation,
  }
}

/**
 * Guard for a role page: no session → /login; right person, wrong page →
 * their own home. Call it at the top of every role page AND every action.
 */
export async function getRequiredUser(role: Role): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== role) redirect(HOME_BY_ROLE[user.role])
  return user
}
