import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getCurrentUser, HOME_BY_ROLE } from '@/lib/auth'
import { LeaveBanner } from '@/components/LeaveBanner'
import { LeaveForm, type LeaveSignerOption } from '@/components/LeaveForm'

/**
 * The submit screen (Leave-design §5). The proxy only requires a session
 * for /leave/*, so the page itself applies the role gate: Admin is bounced
 * to /admin — admin files nothing (rule L11).
 */
export default async function NewLeavePage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role === 'Admin') redirect(HOME_BY_ROLE.Admin)

  const { ok } = await searchParams

  // Eligible signers (Reference C): same division, Supervisor or HR, never
  // the requester. The server re-checks this in every submit (rule L3).
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
            New leave request
          </h1>
        </div>
        <LeaveBanner ok={ok} />
        <LeaveForm signers={signers satisfies LeaveSignerOption[]} />
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
