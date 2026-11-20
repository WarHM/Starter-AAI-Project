import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { HOME_BY_ROLE } from '@/lib/session'

// Signpost (also handled by src/proxy.ts before rendering — kept as the
// page-side re-check, design rule 9).
export default async function Home() {
  const user = await getCurrentUser()
  redirect(user ? HOME_BY_ROLE[user.role] : '/login')
}
