import { LoginForm } from './login-form'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ loggedOut?: string }>
}) {
  const { loggedOut } = await searchParams

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_65%_55%,#6889b8_0%,#41639a_45%,#2e4a76_100%)] p-4">
      <div className="w-full max-w-sm space-y-6 rounded-[28px] border border-white/10 bg-white/10 p-6 shadow-[0_25px_60px_-15px_rgba(12,27,54,0.65)] backdrop-blur-sm">
        <div className="rounded-2xl bg-[#31517f]/90 px-6 py-6 text-center">
          <h1 className="text-xl font-bold uppercase tracking-[0.15em] text-white">
            Budiman HRMS
          </h1>
        </div>
        <p className="-mt-3 text-center text-sm text-white/70">
          Sign in with your work email
        </p>
        {loggedOut && (
          <p className="rounded-xl bg-white/10 px-4 py-2 text-center text-sm text-green-200">
            You are logged out
          </p>
        )}
        <LoginForm />
      </div>
    </main>
  )
}
