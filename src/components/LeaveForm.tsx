'use client'

import { useActionState } from 'react'
import { createLeave, updateLeave } from '@/app/leave/actions'
import { LEAVE_TYPES } from '@/lib/leave'

export type LeaveSignerOption = { id: number; name: string; role: string }

export type LeaveFormInitial = {
  leaveType: string
  reason: string | null
  startDate: string
  endDate: string
  supervisorId: number
}

const pillClass =
  'w-full rounded-full border border-white/60 bg-transparent px-6 py-3 text-sm text-white placeholder:text-center placeholder:text-xs placeholder:uppercase placeholder:tracking-wider placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/40'

// Selects and date boxes get a solid fill so the native dropdown and the
// picker icon stay readable on the blue card.
const selectClass =
  'w-full rounded-full border border-white/60 bg-[#2e4a76] px-6 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/40'
const dateClass = `${pillClass} [color-scheme:dark]`
const textareaClass =
  'w-full rounded-2xl border border-white/60 bg-transparent px-6 py-3 text-sm text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/40'
const labelClass = 'mb-1 block text-xs uppercase tracking-wider text-white/70'

/**
 * The submit form, shared by /leave/new and /leave/[id]/edit (a rowId +
 * initial turns it into the edit form of transition 2). Client-side checks
 * are politeness only — the action re-validates everything (L3, OWASP A03).
 */
export function LeaveForm({
  signers,
  rowId,
  initial,
}: {
  signers: LeaveSignerOption[]
  rowId?: number
  initial?: LeaveFormInitial
}) {
  const editing = rowId !== undefined
  const boundAction = editing
    ? updateLeave.bind(null, rowId)
    : createLeave
  const [state, formAction, isPending] = useActionState(boundAction, undefined)

  return (
    <form
      action={formAction}
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        // L10: Cancel means the action never reaches the server.
        const question = editing
          ? 'Save these changes?'
          : 'Submit this leave request?'
        if (!window.confirm(question)) event.preventDefault()
      }}
    >
      <div>
        <label htmlFor="leaveType" className={labelClass}>
          Leave type
        </label>
        <select
          id="leaveType"
          name="leaveType"
          required
          defaultValue={initial?.leaveType ?? ''}
          className={selectClass}
        >
          <option value="" disabled>
            Choose leave type
          </option>
          {LEAVE_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="reason" className={labelClass}>
          Reason (required for Other and Compassionate leave)
        </label>
        <textarea
          id="reason"
          name="reason"
          rows={3}
          maxLength={500}
          placeholder="What the leave is for"
          defaultValue={initial?.reason ?? ''}
          className={textareaClass}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="startDate" className={labelClass}>
            From
          </label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            required
            defaultValue={initial?.startDate ?? ''}
            className={dateClass}
          />
        </div>
        <div>
          <label htmlFor="endDate" className={labelClass}>
            To
          </label>
          <input
            id="endDate"
            name="endDate"
            type="date"
            required
            defaultValue={initial?.endDate ?? ''}
            className={dateClass}
          />
        </div>
      </div>
      <div>
        <label htmlFor="supervisorId" className={labelClass}>
          Signer (same division)
        </label>
        <select
          id="supervisorId"
          name="supervisorId"
          required
          defaultValue={initial ? String(initial.supervisorId) : ''}
          className={selectClass}
        >
          <option value="" disabled>
            Choose signer
          </option>
          {signers.map((signer) => (
            <option key={signer.id} value={signer.id}>
              {signer.name} — {signer.role}
            </option>
          ))}
        </select>
      </div>
      {state?.errors && state.errors.length > 0 && (
        <ul role="alert" className="space-y-1 text-center text-sm text-red-200">
          {state.errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="mx-auto block w-3/4 rounded-full bg-[#a9c3de] px-8 py-3 text-sm font-bold uppercase tracking-[0.15em] text-white transition hover:bg-[#bcd2e8] disabled:opacity-50"
      >
        {isPending
          ? editing
            ? 'Saving…'
            : 'Submitting…'
          : editing
            ? 'Save changes'
            : 'Submit request'}
      </button>
    </form>
  )
}
