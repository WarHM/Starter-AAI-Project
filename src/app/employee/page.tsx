import { getRequiredUser } from '@/lib/auth'
import { RoleHome } from '@/components/RoleHome'

export default async function EmployeeHomePage() {
  const user = await getRequiredUser('Employee')
  return <RoleHome user={user} />
}
