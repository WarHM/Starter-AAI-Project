import { prisma } from '@/lib/db'
import { getRequiredUser } from '@/lib/auth'
import { RoleHome } from '@/components/RoleHome'
import { LeaveSection } from '@/components/LeaveTable'

export default async function SupervisorHomePage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>
}) {
  const user = await getRequiredUser('Supervisor')
  const { ok } = await searchParams

  // Rows naming me as signer, still Pending (L8: strictly what §4 allows;
  // never my own filing — the dropdown already blocks it, L5 double-checks).
  const awaiting = await prisma.leaveRequest.findMany({
    where: { supervisorId: user.id, status: 'Pending supervisor' },
    include: {
      supervisor: { select: { name: true } },
      employee: { select: { name: true } },
    },
    orderBy: { submittedAt: 'desc' },
  })
  // A supervisor is also a filer (⚑ interview): their own rows, newest first.
  const rows = await prisma.leaveRequest.findMany({
    where: { employeeId: user.id },
    include: {
      supervisor: { select: { name: true } },
      employee: { select: { name: true } },
    },
    orderBy: { submittedAt: 'desc' },
  })

  return (
    <RoleHome user={user} ok={ok}>
      <LeaveSection title="Awaiting my signature" rows={awaiting} showRequester />
      <LeaveSection title="My leave requests" rows={rows} />
    </RoleHome>
  )
}
