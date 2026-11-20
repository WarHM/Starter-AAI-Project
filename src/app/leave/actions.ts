'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getCurrentUser, HOME_BY_ROLE } from '@/lib/auth'
import { canAct, overlapExists, validateRequest } from '@/lib/leave'

export type LeaveFormState = { errors?: string[] }
export type LeaveDecisionState = { error?: string }

/** Every surface that shows leave data is refreshed after a mutation. */
function revalidateLeaveSurfaces(id: number): void {
  for (const home of ['/employee', '/supervisor', '/hr', '/admin']) {
    revalidatePath(home)
  }
  revalidatePath(`/leave/${id}`)
}

const REMARK_MAX_LENGTH = 500

function trimmedRemark(formData: FormData): string {
  return String(formData.get('remark') ?? '').trim()
}

/**
 * State-machine transition 1 (Leave-design §2): create as Pending
 * supervisor. The requester comes from the session, never the form
 * (OWASP A01); every field is re-validated server-side (L3) and the
 * calendar is checked for double-booking (L4) before the row is written.
 */
export async function createLeave(
  _previous: LeaveFormState | undefined,
  formData: FormData,
): Promise<LeaveFormState> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  // L11/§8: an Admin posting this action is bounced server-side too.
  if (user.role === 'Admin') redirect(HOME_BY_ROLE.Admin)

  const result = await validateRequest(user, {
    leaveType: String(formData.get('leaveType') ?? ''),
    reason: String(formData.get('reason') ?? ''),
    startDate: String(formData.get('startDate') ?? ''),
    endDate: String(formData.get('endDate') ?? ''),
    supervisorId: formData.get('supervisorId'),
  })
  if (!result.ok) return { errors: result.errors }

  if (
    await overlapExists(user.id, result.value.startDate, result.value.endDate)
  ) {
    return { errors: ['You already have a request covering those dates'] }
  }

  await prisma.leaveRequest.create({
    data: {
      employeeId: user.id,
      status: 'Pending supervisor',
      ...result.value,
    },
  })

  revalidatePath(HOME_BY_ROLE[user.role])
  redirect(`${HOME_BY_ROLE[user.role]}?ok=submitted`)
}

/**
 * State-machine transition 4 (Leave-design §2): the named supervisor
 * signs. canAct covers the role, the per-record rights, the status
 * (replay defence) and L5 — signer is never the requester.
 */
export async function signLeave(id: number): Promise<void> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const row = await prisma.leaveRequest.findUnique({ where: { id } })
  if (!row || !canAct(user, row, 'sign')) redirect(HOME_BY_ROLE[user.role])

  await prisma.leaveRequest.update({
    where: { id: row.id },
    data: { status: 'Signed', signedAt: new Date() },
  })
  revalidateLeaveSurfaces(row.id)
  redirect(`/leave/${row.id}?ok=signed`)
}

/**
 * Transition 6 (Leave-design §2): only the requester moves a Signed
 * request into the shared HR queue.
 */
export async function sendToHr(id: number): Promise<void> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const row = await prisma.leaveRequest.findUnique({ where: { id } })
  if (!row || !canAct(user, row, 'sendToHr')) redirect(HOME_BY_ROLE[user.role])

  await prisma.leaveRequest.update({
    where: { id: row.id },
    data: { status: 'Pending HR' },
  })
  revalidateLeaveSurfaces(row.id)
  redirect(`/leave/${row.id}?ok=sent`)
}

/**
 * Transition 2 (Leave-design §2): the requester edits their own
 * Pending-supervisor request. Every submit rule runs again (L3) and the
 * overlap check excludes this very row (L4, AC-26).
 */
export async function updateLeave(
  id: number,
  _previous: LeaveFormState | undefined,
  formData: FormData,
): Promise<LeaveFormState> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const row = await prisma.leaveRequest.findUnique({ where: { id } })
  if (!row || !canAct(user, row, 'edit')) redirect(HOME_BY_ROLE[user.role])

  const result = await validateRequest(user, {
    leaveType: String(formData.get('leaveType') ?? ''),
    reason: String(formData.get('reason') ?? ''),
    startDate: String(formData.get('startDate') ?? ''),
    endDate: String(formData.get('endDate') ?? ''),
    supervisorId: formData.get('supervisorId'),
  })
  if (!result.ok) return { errors: result.errors }

  if (
    await overlapExists(
      user.id,
      result.value.startDate,
      result.value.endDate,
      row.id,
    )
  ) {
    return { errors: ['You already have a request covering those dates'] }
  }

  await prisma.leaveRequest.update({ where: { id: row.id }, data: result.value })
  revalidateLeaveSurfaces(row.id)
  redirect(`/leave/${row.id}?ok=updated`)
}

/**
 * Transition 3: the requester's undo — hard delete, only while Pending
 * supervisor (L9); afterwards history is immutable for everyone.
 */
export async function deleteLeave(id: number): Promise<void> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const row = await prisma.leaveRequest.findUnique({ where: { id } })
  if (!row || !canAct(user, row, 'delete')) redirect(HOME_BY_ROLE[user.role])

  await prisma.leaveRequest.delete({ where: { id: row.id } })
  revalidateLeaveSurfaces(row.id)
  redirect(`${HOME_BY_ROLE[user.role]}?ok=deleted`)
}

/**
 * Transition 7 (Leave-design §2): any HR officer but the requester
 * approves. The decider is taken from the verified session, never from
 * the form (L6, AC-23); canAct covers role, L5 and the status check.
 */
export async function approveLeave(id: number): Promise<void> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const row = await prisma.leaveRequest.findUnique({ where: { id } })
  if (!row || !canAct(user, row, 'approve')) redirect(HOME_BY_ROLE[user.role])

  await prisma.leaveRequest.update({
    where: { id: row.id },
    data: { status: 'Approved', hrOfficerId: user.id, decidedAt: new Date() },
  })
  revalidateLeaveSurfaces(row.id)
  redirect(`/leave/${row.id}?ok=approved`)
}

/**
 * Transition 8: the HR rejection — same session-sourced decider, plus
 * the rejection's shadow: remark required, length-capped, stored with
 * decidedAt (L7).
 */
export async function rejectByHrLeave(
  id: number,
  _previous: LeaveDecisionState | undefined,
  formData: FormData,
): Promise<LeaveDecisionState> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const row = await prisma.leaveRequest.findUnique({ where: { id } })
  if (!row || !canAct(user, row, 'rejectHr')) {
    redirect(HOME_BY_ROLE[user.role])
  }

  const remark = trimmedRemark(formData)
  if (remark === '') return { error: 'A remark is required to reject' }
  if (remark.length > REMARK_MAX_LENGTH) {
    return { error: `Remark must be ${REMARK_MAX_LENGTH} characters or fewer` }
  }

  await prisma.leaveRequest.update({
    where: { id: row.id },
    data: {
      status: 'Rejected by HR',
      hrOfficerId: user.id,
      hrRemark: remark,
      decidedAt: new Date(),
    },
  })
  revalidateLeaveSurfaces(row.id)
  redirect(`/leave/${row.id}?ok=rejected-hr`)
}

/**
 * Transition 5: the named supervisor rejects — the remark is the
 * rejection's shadow (L7): required, length-capped, stored with decidedAt.
 */
export async function rejectBySupervisorLeave(
  id: number,
  _previous: LeaveDecisionState | undefined,
  formData: FormData,
): Promise<LeaveDecisionState> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const row = await prisma.leaveRequest.findUnique({ where: { id } })
  if (!row || !canAct(user, row, 'rejectSupervisor')) {
    redirect(HOME_BY_ROLE[user.role])
  }

  const remark = trimmedRemark(formData)
  if (remark === '') return { error: 'A remark is required to reject' }
  if (remark.length > REMARK_MAX_LENGTH) {
    return { error: `Remark must be ${REMARK_MAX_LENGTH} characters or fewer` }
  }

  await prisma.leaveRequest.update({
    where: { id: row.id },
    data: {
      status: 'Rejected by supervisor',
      supervisorRemark: remark,
      decidedAt: new Date(),
    },
  })
  revalidateLeaveSurfaces(row.id)
  redirect(`/leave/${row.id}?ok=rejected-supervisor`)
}
