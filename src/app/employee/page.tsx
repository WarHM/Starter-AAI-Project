import { prisma } from '@/lib/db'
import { getRequiredUser } from '@/lib/auth'
import { RoleHome } from '@/components/RoleHome'
import { LeaveSection } from '@/components/LeaveTable'

export default async function EmployeeHomePage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>
}) {
  const user = await getRequiredUser('Employee')
  const { ok } = await searchParams

  // L8/§4: an employee's list is exactly their own rows, newest first.
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
      <LeaveSection title="My leave requests" rows={rows} />
    </RoleHome>
  )
}
