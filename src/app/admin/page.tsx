import Link from 'next/link'
import { prisma } from '@/lib/db'
import { getRequiredUser } from '@/lib/auth'
import { RoleHome } from '@/components/RoleHome'
import { STATUSES, type LeaveStatus } from '@/lib/leave'
import { StatusBadge, dayLabel } from '@/components/LeaveTable'

// Admin is a window, not a hand (rule L11): the full table newest-first,
// one Status filter, zero buttons. The detail page and every server action
// keep refusing Admin (Leave-design §4).

const chipBase =
  'rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition'

function FilterChip({
  href,
  label,
  active,
}: {
  href: string
  label: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={`${chipBase} ${
        active
          ? 'bg-[#a9c3de] text-white'
          : 'border border-white/60 text-white/80 hover:bg-white/10'
      }`}
    >
      {label}
    </Link>
  )
}

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const user = await getRequiredUser('Admin')
  const { status } = await searchParams
  // A bogus ?status= value is simply treated as "All" (task 18 check).
  const activeStatus = (STATUSES as readonly string[]).includes(status ?? '')
    ? (status as LeaveStatus)
    : null

  const rows = await prisma.leaveRequest.findMany({
    where: activeStatus ? { status: activeStatus } : {},
    include: {
      employee: { select: { name: true, division: true } },
      hrOfficer: { select: { name: true } },
    },
    orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
  })

  return (
    <RoleHome user={user}>
      <section className="space-y-3 text-left">
        <h2 className="text-xs uppercase tracking-wider text-white/70">
          All leave requests
        </h2>
        <nav className="flex flex-wrap gap-2">
          <FilterChip href="/admin" label="All" active={activeStatus === null} />
          {STATUSES.map((s) => (
            <FilterChip
              key={s}
              href={`/admin?status=${encodeURIComponent(s)}`}
              label={s}
              active={activeStatus === s}
            />
          ))}
        </nav>
        {rows.length === 0 ? (
          <p className="text-sm text-white/75">No leave requests match this filter.</p>
        ) : (
          <div className="overflow-x-auto text-left">
            <table className="w-full border-collapse text-sm text-white/90">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-white/60">
                  <th className="px-2 py-2 font-semibold">Requester</th>
                  <th className="px-2 py-2 font-semibold">Division</th>
                  <th className="px-2 py-2 font-semibold">Type</th>
                  <th className="px-2 py-2 font-semibold">Dates</th>
                  <th className="px-2 py-2 font-semibold">Days</th>
                  <th className="px-2 py-2 font-semibold">Status</th>
                  <th className="px-2 py-2 font-semibold">Latest remark</th>
                  <th className="px-2 py-2 font-semibold">HR decider</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="relative border-t border-white/10 hover:bg-white/5"
                  >
                    <td className="px-2 py-2">{row.employee.name}</td>
                    <td className="px-2 py-2">{row.employee.division}</td>
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
                    <td className="px-2 py-2">
                      {dayLabel(row.startDate, row.endDate)}
                    </td>
                    <td className="px-2 py-2">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-2 py-2">
                      {row.hrRemark ?? row.supervisorRemark ?? '—'}
                    </td>
                    <td className="px-2 py-2">{row.hrOfficer?.name ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </RoleHome>
  )
}
