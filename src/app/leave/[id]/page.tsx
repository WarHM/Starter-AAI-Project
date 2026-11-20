import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getCurrentUser, HOME_BY_ROLE } from '@/lib/auth'
import { canAct, canView } from '@/lib/leave'
import { LeaveBanner } from '@/components/LeaveBanner'
import {
  HrDecisionButtons,
  RequesterEditDelete,
  SendToHrButton,
  SupervisorDecisionButtons,
} from '@/components/LeaveActions'
import { StatusBadge, dayLabel, formatDate } from '@/components/LeaveTable'

/**
 * The detail page (Leave-design §5): the full record read-only, checked
 * per record with the shared predicate — ids from the URL are never
 * trusted (OWASP A01, L8). Outsiders are bounced to their own home.
 * Action buttons arrive with the transitions (tasks 13–17).
 */
export default async function LeaveDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ ok?: string }>
}) {
  const { id } = await params
  const { ok } = await searchParams
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const rowId = Number(id)
  if (!Number.isInteger(rowId) || rowId <= 0) redirect(HOME_BY_ROLE[user.role])

  const row = await prisma.leaveRequest.findUnique({
    where: { id: rowId },
    include: {
      employee: { select: { name: true } },
      supervisor: { select: { name: true } },
      hrOfficer: { select: { name: true } },
    },
  })
  if (!row) redirect(HOME_BY_ROLE[user.role])
  if (!canView(user, row)) redirect(HOME_BY_ROLE[user.role])

  const facts: [string, string][] = [
    ['Requester', row.employee.name],
    ['Chosen supervisor', row.supervisor.name],
    ['Leave type', row.leaveType],
    ['Reason', row.reason ?? '—'],
    ['Dates', `${row.startDate} → ${row.endDate} (${dayLabel(row.startDate, row.endDate)})`],
    ['Supervisor remark', row.supervisorRemark ?? '—'],
    ['HR remark', row.hrRemark ?? '—'],
    ['HR decider', row.hrOfficer?.name ?? '—'],
    ['Submitted', formatDate(row.submittedAt)],
    ['Signed', row.signedAt ? formatDate(row.signedAt) : '—'],
    ['Decided', row.decidedAt ? formatDate(row.decidedAt) : '—'],
  ]

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_65%_55%,#6889b8_0%,#41639a_45%,#2e4a76_100%)] p-4">
      <div className="w-full max-w-lg space-y-6 rounded-[28px] border border-white/10 bg-white/10 p-6 text-center shadow-[0_25px_60px_-15px_rgba(12,27,54,0.65)] backdrop-blur-sm">
        <div className="rounded-2xl bg-[#31517f]/90 px-6 py-6">
          <h1 className="text-xl font-bold uppercase tracking-[0.15em] text-white">
            Leave request #{row.id}
          </h1>
        </div>
        <LeaveBanner ok={ok} />
        <div className="space-y-3 text-left text-sm text-white/90">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs uppercase tracking-wider text-white/70">
              Status
            </span>
            <StatusBadge status={row.status} />
          </div>
          {facts.map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-4">
              <span className="text-xs uppercase tracking-wider text-white/70">
                {label}
              </span>
              <span className="text-right">{value}</span>
            </div>
          ))}
        </div>
        {/* Action buttons render here for the allowed viewer + status
            (tasks 13–17); nothing is shown for Admin, ever (rule L11). */}
        {canAct(user, row, 'sign') && <SupervisorDecisionButtons rowId={row.id} />}
        {canAct(user, row, 'sendToHr') && <SendToHrButton rowId={row.id} />}
        {canAct(user, row, 'approve') && <HrDecisionButtons rowId={row.id} />}
        {canAct(user, row, 'edit') && <RequesterEditDelete rowId={row.id} />}
        <div>
          <Link
            href={HOME_BY_ROLE[user.role]}
            className="text-sm text-white/80 hover:text-white hover:underline"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  )
}
