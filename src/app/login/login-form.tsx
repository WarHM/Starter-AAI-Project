'use client'

import { useActionState } from 'react'
import { login } from './actions'

const inputClass =
  'w-full rounded-full border border-white/60 bg-transparent px-6 py-3 text-sm text-white placeholder:text-center placeholder:text-xs placeholder:uppercase placeholder:tracking-wider placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/40'

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, undefined)

  return (
    <form action={formAction} noValidate className="space-y-4">
      <div>
        <label htmlFor="email" className="sr-only">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="Email"
          className={inputClass}
        />
        {state?.error && (
          <p role="alert" className="mt-2 text-center text-sm text-red-200">
            {state.error}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="password" className="sr-only">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="Password"
          className={inputClass}
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="mx-auto block w-3/4 rounded-full bg-[#a9c3de] px-8 py-3 text-sm font-bold uppercase tracking-[0.15em] text-white transition hover:bg-[#bcd2e8] disabled:opacity-50"
      >
        {isPending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
