import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getCurrentUser, HOME_BY_ROLE } from '@/lib/auth'
import { canAct } from '@/lib/leave'
import { LeaveBanner } from '@/components/LeaveBanner'
import { LeaveForm, type LeaveSignerOption } from '@/components/LeaveForm'

/**
 * The edit screen (Leave-design §5, transition 2): pre-filled form +
 * the rules of submit re-checked server-side in updateLeave. The
 * canAct('edit') gate — requester's own row, still Pending supervisor
 * (L9) — guards this page; every other viewer or status is bounced.
 */
export default async function EditLeavePage({
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

  const row = await prisma.leaveRequest.findUnique({ where: { id: rowId } })
  if (!row || !canAct(user, row, 'edit')) redirect(HOME_BY_ROLE[user.role])

  // Same eligible-signer list as /leave/new (Reference C); the action
  // re-checks it on save.
  const signers = await prisma.user.findMany({
    where: {
      division: user.division,
      role: { in: ['Supervisor', 'HR'] },
      id: { not: user.id },
    },
    select: { id: true, name: true, role: true },
    orderBy: { name: 'asc' },
  })

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_65%_55%,#6889b8_0%,#41639a_45%,#2e4a76_100%)] p-4">
      <div className="w-full max-w-sm space-y-6 rounded-[28px] border border-white/10 bg-white/10 p-6 shadow-[0_25px_60px_-15px_rgba(12,27,54,0.65)] backdrop-blur-sm">
        <div className="rounded-2xl bg-[#31517f]/90 px-6 py-6 text-center">
          <h1 className="text-xl font-bold uppercase tracking-[0.15em] text-white">
            Edit leave request #{row.id}
          </h1>
        </div>
        <LeaveBanner ok={ok} />
        <LeaveForm
          signers={signers satisfies LeaveSignerOption[]}
          rowId={row.id}
          initial={{
            leaveType: row.leaveType,
            reason: row.reason,
            startDate: row.startDate,
            endDate: row.endDate,
            supervisorId: row.supervisorId,
          }}
        />
        <div>
          <Link
            href={`/leave/${row.id}`}
            className="text-sm text-white/80 hover:text-white hover:underline"
          >
            Back to the request
          </Link>
        </div>
      </div>
    </main>
  )
}
