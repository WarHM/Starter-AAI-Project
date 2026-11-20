import { getRequiredUser } from '@/lib/auth'
import { RoleHome } from '@/components/RoleHome'

export default async function SupervisorHomePage() {
  const user = await getRequiredUser('Supervisor')
  return <RoleHome user={user} />
}
