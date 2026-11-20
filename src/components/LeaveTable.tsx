import Link from 'next/link'
import type { Prisma } from '@prisma/client'
import { dayCount } from '@/lib/leave'

// A request joined with the people's names the tables show — what every
// "my requests" / signature / queue list needs to render a row.
export type LeaveRowWithSupervisor = Prisma.LeaveRequestGetPayload<{
  include: {
    supervisor: { select: { name: true } }
    employee: { select: { name: true } }
  }
}>

// The shared requests table (Leave-design §7): status and the latest remark
// always show — FR-06 "with the status and remarks". Rows stretch their
// type-link over the whole row, so clicking anywhere opens the detail page.
export type LeaveTableRow = {
  id: number
  leaveType: string
  startDate: string
  endDate: string
  status: string
  supervisorName: string
  requesterName: string
  latestRemark: string | null
  submittedAt: Date
}

export function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10)
}

export function dayLabel(startDate: string, endDate: string): string {
  const days = dayCount(startDate, endDate)
  return `${days} day${days === 1 ? '' : 's'}`
}

export function StatusBadge({ status }: { status: string }) {
  const tone = status.startsWith('Rejected')
    ? 'bg-red-400/20 text-red-100'
    : status === 'Approved'
      ? 'bg-green-400/20 text-green-100'
      : 'bg-white/15 text-white'
  return (
    <span
      className={`inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${tone}`}
    >
      {status}
    </span>
  )
}

export function toLeaveTableRow(row: LeaveRowWithSupervisor): LeaveTableRow {
  return {
    id: row.id,
    leaveType: row.leaveType,
    startDate: row.startDate,
    endDate: row.endDate,
    status: row.status,
    supervisorName: row.supervisor.name,
    requesterName: row.employee.name,
    latestRemark: row.hrRemark ?? row.supervisorRemark,
    submittedAt: row.submittedAt,
  }
}

/** A titled list section as used on the role homes (Leave-design §5). */
export function LeaveSection({
  title,
  rows,
  showRequester = false,
}: {
  title: string
  rows: LeaveRowWithSupervisor[]
  showRequester?: boolean
}) {
  return (
    <section className="space-y-2 text-left">
      <h2 className="text-xs uppercase tracking-wider text-white/70">{title}</h2>
      <LeaveTable rows={rows.map(toLeaveTableRow)} showRequester={showRequester} />
    </section>
  )
}

/**
 * The shared table; §7: columns switch by role context — the signature
 * queue shows the requester (the supervisor column would only repeat the
 * viewer), the filer's own list shows the chosen supervisor instead.
 */
export function LeaveTable({
  rows,
  showRequester = false,
}: {
  rows: LeaveTableRow[]
  showRequester?: boolean
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-white/75">No leave requests yet.</p>
  }
  return (
    <div className="overflow-x-auto text-left">
      <table className="w-full border-collapse text-sm text-white/90">
        <thead>
          <tr className="text-xs uppercase tracking-wider text-white/60">
            {showRequester && <th className="px-2 py-2 font-semibold">Requester</th>}
            <th className="px-2 py-2 font-semibold">Type</th>
            <th className="px-2 py-2 font-semibold">Dates</th>
            <th className="px-2 py-2 font-semibold">Days</th>
            <th className="px-2 py-2 font-semibold">Status</th>
            {!showRequester && (
              <th className="px-2 py-2 font-semibold">Supervisor</th>
            )}
            <th className="px-2 py-2 font-semibold">Latest remark</th>
            <th className="px-2 py-2 font-semibold">Submitted</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="relative border-t border-white/10 hover:bg-white/5"
            >
              {showRequester && <td className="px-2 py-2">{row.requesterName}</td>}
              <td className="px-2 py-2">
                <Link
                  href={`/leave/${row.id}`}
                  className="font-semibold text-white underline-offset-2 hover:underline after:absolute after:inset-0 after:content-['']"
                >
                  {row.leaveType}
                </Link>
              </td>
              <td className="px-2 py-2">
                {row.startDate} → {row.endDate}
              </td>
              <td className="px-2 py-2">{dayLabel(row.startDate, row.endDate)}</td>
              <td className="px-2 py-2">
                <StatusBadge status={row.status} />
              </td>
              {!showRequester && <td className="px-2 py-2">{row.supervisorName}</td>}
              <td className="px-2 py-2">{row.latestRemark ?? '—'}</td>
              <td className="px-2 py-2">{formatDate(row.submittedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
