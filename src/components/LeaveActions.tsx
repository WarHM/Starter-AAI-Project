'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import {
  approveLeave,
  deleteLeave,
  rejectByHrLeave,
  rejectBySupervisorLeave,
  sendToHr,
  signLeave,
} from '@/app/leave/actions'

// The named supervisor's buttons on the detail page (transitions 4–5).
// The server actions re-check everything; these forms are the polite face.
// L10: every button carries the native confirm.

const filledButtonClass =
  'w-full rounded-full bg-[#a9c3de] px-8 py-3 text-sm font-bold uppercase tracking-[0.15em] text-white transition hover:bg-[#bcd2e8] disabled:opacity-50'
const outlineButtonClass =
  'w-full rounded-full border border-white/60 bg-transparent px-8 py-3 text-sm font-bold uppercase tracking-[0.15em] text-white transition hover:bg-white/10 disabled:opacity-50'
const textareaClass =
  'w-full rounded-2xl border border-white/60 bg-transparent px-6 py-3 text-sm text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/40'

export function SupervisorDecisionButtons({ rowId }: { rowId: number }) {
  const [state, rejectAction, isPending] = useActionState(
    rejectBySupervisorLeave.bind(null, rowId),
    undefined,
  )

  return (
    <div className="space-y-3 text-left">
      <form
        action={signLeave.bind(null, rowId)}
        onSubmit={(event) => {
          if (!window.confirm('Sign this leave request?')) event.preventDefault()
        }}
      >
        <button type="submit" className={filledButtonClass}>
          Sign request
        </button>
      </form>
      <form
        action={rejectAction}
        onSubmit={(event) => {
          if (!window.confirm('Reject this leave request?')) event.preventDefault()
        }}
        className="space-y-2"
      >
        <label htmlFor="remark" className="block text-xs uppercase tracking-wider text-white/70">
          Remark (required to reject)
        </label>
        <textarea
          id="remark"
          name="remark"
          rows={2}
          maxLength={500}
          placeholder="Why this is rejected"
          className={textareaClass}
        />
        {state?.error && <p className="text-sm text-red-200">{state.error}</p>}
        <button type="submit" disabled={isPending} className={outlineButtonClass}>
          {isPending ? 'Rejecting…' : 'Reject'}
        </button>
      </form>
    </div>
  )
}

/**
 * The HR officer's buttons on a Pending-HR request (transitions 7–8).
 * The decider is never in these forms — the server takes it from the
 * session (L6).
 */
export function HrDecisionButtons({ rowId }: { rowId: number }) {
  const [state, rejectAction, isPending] = useActionState(
    rejectByHrLeave.bind(null, rowId),
    undefined,
  )

  return (
    <div className="space-y-3 text-left">
      <form
        action={approveLeave.bind(null, rowId)}
        onSubmit={(event) => {
          if (!window.confirm('Approve this leave request?')) event.preventDefault()
        }}
      >
        <button type="submit" className={filledButtonClass}>
          Approve request
        </button>
      </form>
      <form
        action={rejectAction}
        onSubmit={(event) => {
          if (!window.confirm('Reject this leave request?')) event.preventDefault()
        }}
        className="space-y-2"
      >
        <label
          htmlFor="hr-remark"
          className="block text-xs uppercase tracking-wider text-white/70"
        >
          Remark (required to reject)
        </label>
        <textarea
          id="hr-remark"
          name="remark"
          rows={2}
          maxLength={500}
          placeholder="Why this is rejected"
          className={textareaClass}
        />
        {state?.error && <p className="text-sm text-red-200">{state.error}</p>}
        <button type="submit" disabled={isPending} className={outlineButtonClass}>
          {isPending ? 'Rejecting…' : 'Reject'}
        </button>
      </form>
    </div>
  )
}

/**
 * The requester's Edit link and Delete button, rendered only while the
 * row is theirs and still Pending supervisor (transitions 2–3, L9).
 * Edit is a link; Delete is a confirmed server action.
 */
export function RequesterEditDelete({ rowId }: { rowId: number }) {
  return (
    <div className="space-y-3 text-left">
      <Link
        href={`/leave/${rowId}/edit`}
        className={`${outlineButtonClass} block text-center`}
      >
        Edit request
      </Link>
      <form
        action={deleteLeave.bind(null, rowId)}
        onSubmit={(event) => {
          if (!window.confirm('Delete this leave request?')) event.preventDefault()
        }}
      >
        <button type="submit" className={outlineButtonClass}>
          Delete request
        </button>
      </form>
    </div>
  )
}

/** The requester's Send-to-HR button on a Signed request (transition 6). */
export function SendToHrButton({ rowId }: { rowId: number }) {
  return (
    <form
      action={sendToHr.bind(null, rowId)}
      onSubmit={(event) => {
        if (!window.confirm('Send this request to HR?')) event.preventDefault()
      }}
      className="text-left"
    >
      <button type="submit" className={filledButtonClass}>
        Send to HR
      </button>
    </form>
  )
}
