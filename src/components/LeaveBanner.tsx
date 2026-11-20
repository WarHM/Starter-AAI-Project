// The `?ok=` success strip (rule L10): a page passes the query param it was
// redirected with after a successful action; unknown keys render nothing.
// The palette matches the change-password success line (login design §4).
const MESSAGES: Record<string, string> = {
  submitted: 'Leave request submitted',
  signed: 'Leave request signed',
  'rejected-supervisor': 'Leave request rejected',
  sent: 'Sent to HR',
  approved: 'Leave request approved',
  'rejected-hr': 'Leave request rejected by HR',
  updated: 'Leave request updated',
  deleted: 'Leave request deleted',
}

export function LeaveBanner({ ok }: { ok?: string }) {
  const message = ok === undefined ? undefined : MESSAGES[ok]
  if (!message) return null
  return (
    <p
      role="status"
      className="rounded-xl bg-white/10 px-4 py-2 text-center text-sm text-green-200"
    >
      {message}
    </p>
  )
}
