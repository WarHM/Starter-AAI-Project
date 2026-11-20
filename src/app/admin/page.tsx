import { getRequiredUser } from '@/lib/auth'
import { RoleHome } from '@/components/RoleHome'

export default async function AdminHomePage() {
  const user = await getRequiredUser('Admin')
  return <RoleHome user={user} />
}
