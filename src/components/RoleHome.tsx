import Link from 'next/link'
import type { SessionUser } from '@/lib/auth'
import { logout } from '@/app/login/actions'
import { LeaveBanner } from './LeaveBanner'

// Shared home for every role (design §4): who you are in, and where you go
// from here. `ok` carries the ?ok= success key (rule L10); `children` are
// the role's leave sections (task 12+), which replace the placeholder.
export function RoleHome({
  user,
  ok,
  children,
}: {
  user: SessionUser
  ok?: string
  children?: React.ReactNode
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_65%_55%,#6889b8_0%,#41639a_45%,#2e4a76_100%)] p-4">
      <div
        className={`w-full ${children ? 'max-w-2xl' : 'max-w-sm'} space-y-6 rounded-[28px] border border-white/10 bg-white/10 p-6 text-center shadow-[0_25px_60px_-15px_rgba(12,27,54,0.65)] backdrop-blur-sm`}
      >
        <div className="rounded-2xl bg-[#31517f]/90 px-6 py-6">
          <h1 className="text-xl font-bold uppercase tracking-[0.15em] text-white">
            {user.name}
          </h1>
          <p className="mt-1 text-sm text-white/80">{user.role}</p>
        </div>
        <LeaveBanner ok={ok} />
        {children ?? <p className="text-sm text-white/75">Nothing here yet.</p>}
        {user.role !== 'Admin' && (
          <Link
            href="/leave/new"
            className="mx-auto block w-3/4 rounded-full bg-[#a9c3de] px-8 py-3 text-sm font-bold uppercase tracking-[0.15em] text-white transition hover:bg-[#bcd2e8]"
          >
            New leave request
          </Link>
        )}
        <form action={logout}>
          <button
            type="submit"
            className="mx-auto block w-3/4 rounded-full bg-[#a9c3de] px-8 py-3 text-sm font-bold uppercase tracking-[0.15em] text-white transition hover:bg-[#bcd2e8]"
          >
            Log out
          </button>
        </form>
        <div>
          <Link
            href="/change-password"
            className="text-sm text-white/80 hover:text-white hover:underline"
          >
            Change password
          </Link>
        </div>
      </div>
    </main>
  )
}
