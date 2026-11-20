import { getRequiredUser } from '@/lib/auth'
import { RoleHome } from '@/components/RoleHome'

export default async function HrHomePage() {
  const user = await getRequiredUser('HR')
  return <RoleHome user={user} />
}
