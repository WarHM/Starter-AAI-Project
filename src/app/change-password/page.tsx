import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { HOME_BY_ROLE } from '@/lib/session'
import { ChangePasswordForm } from './change-password-form'

export default async function ChangePasswordPage() {
  // Any logged-in role may change their own password (AC-11, AC-12).
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_65%_55%,#6889b8_0%,#41639a_45%,#2e4a76_100%)] p-4">
      <div className="w-full max-w-sm space-y-6 rounded-[28px] border border-white/10 bg-white/10 p-6 shadow-[0_25px_60px_-15px_rgba(12,27,54,0.65)] backdrop-blur-sm">
        <div className="rounded-2xl bg-[#31517f]/90 px-6 py-6 text-center">
          <h1 className="text-xl font-bold uppercase tracking-[0.15em] text-white">
            Change password
          </h1>
        </div>
        <p className="-mt-3 text-center text-sm text-white/70">
          {user.name} · {user.role} — choose a new password of at least 8
          characters.
        </p>
        <ChangePasswordForm />
        <div className="text-center">
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
