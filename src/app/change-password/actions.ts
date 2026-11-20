'use server'

import { compare, hash } from 'bcryptjs'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { validateNewPassword } from '@/lib/validation'

export type ChangePasswordState = {
  error?: string
  success?: boolean
}

export async function changePassword(
  _previous: ChangePasswordState | undefined,
  formData: FormData,
): Promise<ChangePasswordState> {
  // The action is an untrusted entry point — check the session itself,
  // whatever the page already checked (design rule 9).
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const current = String(formData.get('currentPassword') ?? '')
  const fresh = String(formData.get('newPassword') ?? '')
  const confirm = String(formData.get('confirmPassword') ?? '')

  // Rule 11: only ever our own row, and only after proving the old one.
  const record = await prisma.user.findUnique({ where: { id: user.id } })
  if (!record) {
    redirect('/login') // account gone mid-session
  }
  const currentOk = await compare(current, record.passwordHash)
  if (!currentOk) {
    return { error: 'Your current password is wrong' }
  }

  const passwordProblem = validateNewPassword(fresh)
  if (passwordProblem) {
    return { error: passwordProblem }
  }
  if (fresh !== confirm) {
    return { error: 'New password and confirmation do not match' }
  }

  await prisma.user.update({
    where: { id: user.id }, // never anyone else's row
    data: { passwordHash: await hash(fresh, 10) },
  })
  return { success: true }
}
