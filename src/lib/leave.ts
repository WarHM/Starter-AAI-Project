import type { LeaveRequest } from '@prisma/client'
import { prisma } from './db'
import type { SessionUser } from './auth'

// Reference C lists, stored and displayed verbatim (Leave-design rule L1).
export const LEAVE_TYPES = [
  'Annual leave',
  'Maternity leave',
  'Unpaid leave',
  'Compassionate leave',
  'Other',
] as const

export const STATUSES = [
  'Pending supervisor',
  'Signed',
  'Pending HR',
  'Approved',
  'Rejected by supervisor',
  'Rejected by HR',
] as const

export const FINAL_STATUSES: readonly string[] = [
  'Approved',
  'Rejected by supervisor',
  'Rejected by HR',
]

export type LeaveType = (typeof LEAVE_TYPES)[number]
export type LeaveStatus = (typeof STATUSES)[number]

// The eight state-machine verbs of Leave-design §2; 'rejectSupervisor' /
// 'rejectHr' carry a remark (L7), the rest do not.
export type LeaveAction =
  | 'edit'
  | 'delete'
  | 'sign'
  | 'rejectSupervisor'
  | 'sendToHr'
  | 'approve'
  | 'rejectHr'

// ⚑ interview: reason ("what the leave is for") is mandatory only here.
const REASON_REQUIRED_TYPES: readonly string[] = ['Other', 'Compassionate leave']

// L4: these statuses still occupy the calendar; rejections never block.
const BLOCKING_STATUSES: readonly string[] = [
  'Pending supervisor',
  'Signed',
  'Pending HR',
  'Approved',
]

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const REASON_MAX_LENGTH = 500

export type ValidatedRequest = {
  leaveType: LeaveType
  reason: string | null
  startDate: string
  endDate: string
  supervisorId: number
}

export type ValidationResult =
  | { ok: true; value: ValidatedRequest }
  | { ok: false; errors: string[] }

/** A real calendar day in strict YYYY-MM-DD text (L3): 2026-02-30 fails. */
export function isCalendarDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

/** Whole days inclusive of both dates (Reference C; weekends count). */
export function dayCount(startDate: string, endDate: string): number {
  const ms =
    Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)
  return ms / 86_400_000 + 1
}

/**
 * L3: every field re-checked on the server, submit *and* edit — the form
 * may have been edited in devtools. The supervisor check runs against the
 * live User row (L2): same division, role Supervisor or HR, never self.
 */
export async function validateRequest(
  requester: Pick<SessionUser, 'id' | 'division'>,
  input: {
    leaveType: string
    reason: string
    startDate: string
    endDate: string
    supervisorId: unknown
  },
): Promise<ValidationResult> {
  const errors: string[] = []

  const leaveType = input.leaveType as LeaveType
  if (!LEAVE_TYPES.includes(leaveType)) {
    errors.push('Choose one of the leave types')
  }

  const reason = input.reason.trim()
  if (REASON_REQUIRED_TYPES.includes(leaveType) && reason === '') {
    errors.push('Give a reason for this leave type')
  }
  if (reason.length > REASON_MAX_LENGTH) {
    errors.push(`Reason must be ${REASON_MAX_LENGTH} characters or fewer`)
  }

  const datesOk =
    isCalendarDate(input.startDate) && isCalendarDate(input.endDate)
  if (!isCalendarDate(input.startDate)) {
    errors.push('Start date must be a real date in YYYY-MM-DD format')
  }
  if (!isCalendarDate(input.endDate)) {
    errors.push('End date must be a real date in YYYY-MM-DD format')
  }
  // End-before-start is only meaningful once both dates are real (AC-18).
  if (datesOk && dayCount(input.startDate, input.endDate) < 1) {
    errors.push('End date cannot be before the start date')
  }

  const supervisorId = Number(input.supervisorId)
  if (!Number.isInteger(supervisorId) || supervisorId <= 0) {
    errors.push('Choose who signs your request')
  } else {
    const supervisor = await prisma.user.findUnique({ where: { id: supervisorId } })
    const eligible =
      supervisor !== null &&
      supervisor.division === requester.division &&
      (supervisor.role === 'Supervisor' || supervisor.role === 'HR') &&
      supervisor.id !== requester.id
    if (!eligible) {
      errors.push(
        'The signer must be a Supervisor or HR officer in your division, never yourself',
      )
    }
  }

  if (errors.length > 0) return { ok: false, errors }
  return {
    ok: true,
    value: {
      leaveType,
      reason: reason === '' ? null : reason,
      startDate: input.startDate,
      endDate: input.endDate,
      supervisorId,
    },
  }
}

/**
 * L4 — no double-booking: does this requester already hold a live request
 * touching the range? Text dates compare chronologically in YYYY-MM-DD.
 * An edit passes its own id so it never overlaps with itself (AC-26).
 */
export async function overlapExists(
  employeeId: number,
  startDate: string,
  endDate: string,
  excludeId?: number,
): Promise<boolean> {
  const count = await prisma.leaveRequest.count({
    where: {
      employeeId,
      status: { in: [...BLOCKING_STATUSES] },
      startDate: { lte: endDate },
      endDate: { gte: startDate },
      ...(excludeId === undefined ? {} : { id: { not: excludeId } }),
    },
  })
  return count > 0
}

/**
 * L8 — one viewer per record, consulted by every page and action:
 * own rows; the named signer; any Admin (window, not hand — L11); and
 * either HR officer for the whole Pending-HR queue and every HR-decided
 * record, never their own filings through that HR lens (§4 matrix).
 */
export function canView(
  user: Pick<SessionUser, 'id' | 'role'>,
  row: LeaveRequest,
): boolean {
  if (row.employeeId === user.id) return true
  if (row.supervisorId === user.id) return true
  if (user.role === 'Admin') return true
  return (
    user.role === 'HR' &&
    row.employeeId !== user.id &&
    (row.status === 'Pending HR' || FINAL_STATUSES.includes(row.status))
  )
}

/**
 * L8/L9/L11 — who may fire which transition of §2. The action re-checks
 * status (replay defence) and never lets Admin act; L5 blocks every
 * self-decision even though the UI already hides the button.
 */
export function canAct(
  user: Pick<SessionUser, 'id' | 'role'>,
  row: LeaveRequest,
  action: LeaveAction,
): boolean {
  if (user.role === 'Admin') return false
  switch (action) {
    case 'edit':
    case 'delete':
      return row.employeeId === user.id && row.status === 'Pending supervisor'
    case 'sign':
    case 'rejectSupervisor':
      return (
        row.supervisorId === user.id &&
        row.employeeId !== user.id &&
        row.status === 'Pending supervisor'
      )
    case 'sendToHr':
      return row.employeeId === user.id && row.status === 'Signed'
    case 'approve':
    case 'rejectHr':
      return (
        user.role === 'HR' &&
        row.employeeId !== user.id &&
        row.status === 'Pending HR'
      )
  }
}
