'use client'

import { useActionState } from 'react'
import { changePassword } from './actions'

const inputClass =
  'w-full rounded-full border border-white/60 bg-transparent px-6 py-3 text-sm text-white placeholder:text-center placeholder:text-xs placeholder:uppercase placeholder:tracking-wider placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/40'

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(changePassword, undefined)

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="currentPassword" className="sr-only">
          Current password
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          placeholder="Current password"
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="newPassword" className="sr-only">
          New password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          placeholder="New password"
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="confirmPassword" className="sr-only">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          placeholder="Confirm new password"
          className={inputClass}
        />
        {state?.error && (
          <p role="alert" className="mt-2 text-center text-sm text-red-200">
            {state.error}
          </p>
        )}
      </div>
      {state?.success && (
        <p className="rounded-xl bg-white/10 px-4 py-2 text-center text-sm text-green-200">
          Password changed successfully
        </p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="mx-auto block w-3/4 rounded-full bg-[#a9c3de] px-8 py-3 text-sm font-bold uppercase tracking-[0.15em] text-white transition hover:bg-[#bcd2e8] disabled:opacity-50"
      >
        {isPending ? 'Saving…' : 'Change password'}
      </button>
    </form>
  )
}
