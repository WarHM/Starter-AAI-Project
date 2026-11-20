import { prisma } from '@/lib/db'
import { getRequiredUser } from '@/lib/auth'
import { RoleHome } from '@/components/RoleHome'
import { LeaveSection } from '@/components/LeaveTable'

export default async function HrHomePage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>
}) {
  const user = await getRequiredUser('HR')
  const { ok } = await searchParams

  const includeNames = {
    supervisor: { select: { name: true } },
    employee: { select: { name: true } },
  } as const

  // An HR colleague may be the named signer (⚑ interview): rows naming me,
  // still Pending.
  const awaiting = await prisma.leaveRequest.findMany({
    where: { supervisorId: user.id, status: 'Pending supervisor' },
    include: includeNames,
    orderBy: { submittedAt: 'desc' },
  })
  // Either HR officer decides the whole queue (L6) — except their own
  // filings, which they never see here (rule L5, AC-23).
  const queue = await prisma.leaveRequest.findMany({
    where: { status: 'Pending HR', employeeId: { not: user.id } },
    include: includeNames,
    orderBy: { submittedAt: 'desc' },
  })
  // HR-decided records: every Approved / Rejected by HR row, again never
  // the officer's own filings through this lens (⚑ interview).
  const decided = await prisma.leaveRequest.findMany({
    where: {
      status: { in: ['Approved', 'Rejected by HR'] },
      hrOfficerId: { not: null },
      employeeId: { not: user.id },
    },
    include: includeNames,
    orderBy: { submittedAt: 'desc' },
  })
  // HR files too (⚑ interview): own rows, newest first.
  const rows = await prisma.leaveRequest.findMany({
    where: { employeeId: user.id },
    include: includeNames,
    orderBy: { submittedAt: 'desc' },
  })

  return (
    <RoleHome user={user} ok={ok}>
      <LeaveSection title="Awaiting my signature" rows={awaiting} showRequester />
      <LeaveSection title="HR queue" rows={queue} showRequester />
      <LeaveSection title="Decided by HR" rows={decided} showRequester />
      <LeaveSection title="My leave requests" rows={rows} />
    </RoleHome>
  )
}
