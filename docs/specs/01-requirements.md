# Login – Requirements

> **This file answers:** What should the app do, and why?
> **Who:** The AI drafts it from your interview. You review it.
>
> When the app's behaviour needs to change, update this file **first**.

## 1. The problem

Budiman Company's paper leave process is being replaced by this system, and
about 200 staff must not be able to just stumble into it. The supervisor's
signature, the HR decision and the admin's read-only view all depend on the
system knowing who is using it — one person, one role, and each person sees
only the pages that role owns. Without a guarded door, requests could be read
or decided by the wrong person, which is exactly problem 2 the project set out
to fix ("each person sees only the requests they need to act on").

This module provides:

1. Login with a work email (`@budiman.com`, unique) and password; passwords
   stored hashed with bcryptjs, never as plain text
2. A signed session cookie holding user id, role and expiry — no server-side
   session table; the cookie cannot be forged or tampered with
3. A 30-minute idle timeout that slides on activity, plus a "Log out" link on
   every page
4. One home page per role, reached automatically after login
5. Access control that keeps logged-out users and wrong-role users off pages
   and server actions (follows OWASP Top 10 2025, A01 and A07)
6. A self-service change-password page for logged-in users
7. A seed script that loads the demo people so every tester has the same
   logins

## 2. Who uses it (roles)

| Role | Home page | What they do |
|------|-----------|--------------|
| **Employee** | `/employee` | Logs in, lands on this placeholder home (shows name, role, Log out), logs out, changes own password. The leave form comes later (FR-02). |
| **Supervisor** | `/supervisor` | Same as Employee for this module. Signing requests comes later (FR-03). |
| **HR** | `/hr` | Same as Employee for this module. The HR decision queue comes later (FR-05). |
| **Admin** | **/admin** | Same as Employee for this module. The read-only list of all records comes later (FR-08). |

Demo logins (from the HRMS document, loaded by the seed script):
`employee-1@budiman.com`, `supervisor-1@budiman.com`, `supervisor-2@budiman.com`,
`hr-1@budiman.com`, `hr-2@budiman.com`, `admin@budiman.com` — all with password
`password123`.

## 3. User stories

- **U1. Login** *(High)*. As a member of staff, I can log in with my
  `@budiman.com` email and my password so that only people from Budiman can
  use the system.
- **U2. One generic error for bad credentials** *(High)*. As a member of
  staff, I see a single "Invalid email or password" message when either part
  is wrong, so that the page never reveals which email addresses exist.
- **U3. Slowed guessing** *(High)*. As the company, I want repeated failed
  logins to be rate limited so that guessing passwords is impractical.
- **U4. Stay signed in while active, drop when idle** *(High)*. As a member
  of staff, I stay logged in as I work and am logged out after 30 minutes of
  inactivity, so that a left-open laptop does not stay signed in forever.
- **U5. Log out** *(High)*. As a member of staff, I can log out from any
  page so that the next person at the laptop cannot see my session.
- **U6. My own home page** *(High)*. As a member of staff, after login I
  land on my role's home page showing my name, my role and a Log out link, so
  that I know I am in as myself.
- **U7. Other roles' pages stay closed** *(High)*. As a member of staff, I
  cannot open another role's pages, even by typing the address, so that each
  person sees only what their role owns.
- **U8. Change my password** *(Medium)*. As a logged-in user, I can change my
  own password by proving I know the current one, so that I am not stuck on
  the shared demo password.

## 4. Acceptance checklist

| Status | ID | Check | How to test |
|--------|----|-------|-------------|
| Done | AC-01 | Each demo account can log in and lands on its own home page (U1, U6) | • Open `/login`<br>• Enter `employee-1@budiman.com` / `password123`<br>• Expect to land on `/employee` showing "Employee 1", role "Employee" and a Log out link<br>• Repeat for all six demo accounts: each lands on `/employee`, `/supervisor`, `/hr` or `/admin` matching its role |
| Done | AC-02 | A wrong password is refused without saying which part was wrong (U2) | • Open `/login`<br>• Enter `employee-1@budiman.com` / `wrongpass`<br>• Expect "Invalid email or password", still on `/login` |
| Done | AC-03 | An unknown email gets the same message as a wrong password (U2) | • Enter `nobody@budiman.com` / `password123`<br>• Expect exactly the same "Invalid email or password" as AC-02 — no hint that the email is unknown |
| Done | AC-04 | The email field is checked before submitting (U1) | • Enter `employee1` (no `@`) or leave blank, submit<br>• Expect an inline "Enter a valid email address ending in @budiman.com" under the field |
| Done | AC-05 | Active use keeps the session alive (U4) | • Log in as `employee-1@budiman.com`<br>• Over 40 minutes, click a page link or reload every ~10 minutes<br>• Expect still logged in at the end |
| Done | AC-06 | 30 minutes of idleness logs you out (U4) | • Log in, then leave the app untouched for 31 minutes<br>• Click any link<br>• Expect redirect to `/login` |
| Done | AC-07 | Logging out clears the session (U5) | • While logged in, click "Log out"<br>• Expect `/login` with a "You are logged out" message<br>• Press the browser Back button: expect the page to redirect back to `/login`, not show the home page |
| Done | AC-08 | Repeated failures hit a rate limit (U3) | • On `/login`, submit `employee-1@budiman.com` with a wrong password 10 times<br>• Expect the 11th attempt to say "Too many failed attempts — try again in 15 minutes"<br>• Even the correct password inside the window is refused until it passes |
| Done | AC-09 | A tampered cookie is rejected (U4, U7) | • Log in, open the browser's developer tools<br>• Change the user id or role inside the session cookie<br>• Reload<br>• Expect redirect to `/login` — the signature check fails |
| Done | AC-10 | Another role's pages bounce you back (U7) | • Log in as `employee-1@budiman.com`<br>• Type `/hr` (or `/admin`, `/supervisor`) in the address bar<br>• Expect bounce back to `/employee`<br>• Then, logged out, type `/admin` directly: expect redirect to `/login` |
| Done | AC-11 | Password change proves the current password (U8) | • As `hr-1@budiman.com`, open the change-password page<br>• Try a wrong current password: expect it refused<br>• Try new password shorter than 8 characters, and new/confirm that differ: expect both refused |
| Done | AC-12 | After a password change, only the new one works (U8) | • As `hr-1@budiman.com`, change password to a new one<br>• Expect success message; log out<br>• Old `password123` is refused; the new password logs in<br>• Change it back to `password123` to restore the demo state |
| Done | AC-13 | The seed script loads the same demo people for everyone | • Delete the SQLite database file<br>• Run `npm run db:seed`<br>• Log in as `admin@budiman.com` / `password123`<br>• Run `npm run db:seed` again: expect it to finish cleanly with no duplicate rows |

## 5. Not included (for now)

- Forgot password / email reset — there is no mail server in this offline demo
- Account lockout — rate limiting only; no account can get permanently stuck
- User management screens — accounts come from the seed script; the admin
  cannot add, edit or disable users yet
- The real role content: leave form, supervisor and HR queues, admin list
  (FR-02 to FR-09)
- Multi-factor authentication
- "Remember me" — sessions always end after 30 minutes of idleness
- Server-side session revocation — with a signed cookie only, a session
  cannot be killed before it expires

---

# Leave Request – Requirements

> **This file answers:** What should the app do, and why?
> **Who:** Drafted by the AI from the HRMS document (sections 4–6) and the
> interview of 20/11/2026. You review it.
>
> This section supersedes the "real role content (FR-02 to FR-09)" line in
> the login §5 "Not included" list. Where the interview widened the
> document, the decision is written here explicitly (see the ⚑ marks).

## 1. The problem

Paper leave forms get lost, employees cannot see where their request is,
and HR has no single list waiting for a decision. This module replaces the
paper flow end to end: a staff member files one digital request, the chosen
supervisor from their own division signs it or rejects it with a reason,
the staff member sends a signed request to the shared HR queue, any HR
officer decides and is recorded, and the admin can see every record without
changing anything.

Statuses are exactly the document's six: **Pending supervisor**, **Signed**,
**Pending HR**, **Approved**, **Rejected by supervisor**, **Rejected by HR**
(the last three are final).

Interview decisions that go beyond the document's wording, flagged ⚑:

- ⚑ All non-admin roles submit leave (the document's rule 2 says "Employees
  apply"; the interview widened it to Employee, Supervisor and HR)
- ⚑ The chosen "supervisor" may be any same-division user with role
  Supervisor **or** HR, never yourself (needed so HR officers can file too)
- ⚑ The requester can edit any field or delete their request while it is
  still Pending supervisor (the document never mentions this)
- ⚑ A written reason is required for leave type **Compassionate** as well as
  **Other** (the document says it in the leave-types table but not the
  data table)

## 2. Who uses it (roles)

| Role | Can do in this module |
|------|----------------------|
| **Employee / Supervisor / HR** | Submit a request and pick a signer from their own division; track their own requests; edit or delete one while **Pending supervisor**; send their own **Signed** request to the HR queue |
| **Supervisor (extra)** | Sign or reject (with remark) a request that names them as its supervisor |
| **HR (extra)** | Approve or reject (with remark) any request in the **Pending HR** queue — either officer may decide, the decider is recorded; never a request they filed themselves. Also signs or rejects a request that names them (HR colleagues pick each other as signers — ⚑ interview) |
| **Admin** | View every record, read-only, with a status filter. No buttons, and every action refuses the Admin role server-side |

Demo pairing (existing seed data): Employee 1, Supervisor 1 and Supervisor 2
are all Finance, so a Finance filer picks between Supervisor 1 and 2; HR 1
and HR 2 pick each other.

## 3. User stories

Each story has a priority and a way to test it by hand. Acceptance IDs
(AC-14…) continue the login checklist.

- **U9. Submit a leave request** *(High)*. As a staff member, I file a
  request (type, dates, chosen supervisor, reason when required) and it
  appears in my list as **Pending supervisor** with a success message.
  *Test:* as `employee-1@budiman.com`, New request → Annual leave,
  2026-12-01→2026-12-03, Supervisor 1 → green success, my home list shows
  it, Pending supervisor, "3 days".
- **U10. I can only pick an eligible signer** *(High)*. The supervisor
  dropdown lists only users from my division with role Supervisor or HR,
  never me.
  *Test:* as employee-1 the dropdown shows exactly Supervisor 1 and
  Supervisor 2; as supervisor-1 it shows only Supervisor 2; as hr-1 only
  HR 2; as admin `/leave/new` is refused.
- **U11. Written purpose when required** *(High)*. Types **Other** and
  **Compassionate** cannot be filed without a written "what the leave is
  for"; Annual, Maternity and Unpaid are fine without one.
  *Test:* try Other with the reason blank → inline error; type a reason →
  accepted; try Annual with blank reason → accepted.
- **U12. Date rules, including no double-booking** *(High)*. End date is
  not before start date, and I cannot file dates that overlap one of my own
  requests that has not been rejected.
  *Test:* end before start → refused; file 2026-12-01→03 then a second
  request overlapping 2026-12-02 → refused; after rejecting (or deleting)
  the first, the overlapping one is accepted. Weekends count as days; no
  holiday calendar; no maximum length.
- **U13. The chosen supervisor signs** *(High)*. Only the person named as
  supervisor can sign; it becomes **Signed** and the signing date is
  recorded. I cannot sign my own request.
  *Test:* as supervisor-1, sign employee-1's request (confirm dialog →
  success banner); as supervisor-2 the request is not even visible to them;
  as employee-1 no Sign button exists.
- **U14. The chosen supervisor rejects with a reason** *(High)*. A
  rejection needs a non-empty remark; the requester sees the status
  **Rejected by supervisor** with the remark.
  *Test:* reject with empty remark → refused; type a remark → success;
  employee-1 sees Rejected by supervisor + the remark on the detail page.
- **U15. I send my signed request to HR** *(High)*. Only I can send it, and
  only while it is **Signed**; it becomes **Pending HR** and joins the
  shared HR queue.
  *Test:* as employee-1, Send to HR on a Signed request → Pending HR; the
  supervisor gets no Send button; trying it while Pending supervisor is
  refused.
- **U16. HR decides** *(High)*. Either HR officer approves or rejects a
  Pending-HR request; a rejection needs a remark; the system records which
  officer decided; I cannot decide my own request.
  *Test:* as hr-1, approve employee-1's request → Approved, detail shows
  "Decided by HR 1"; as hr-1, reject hr-1's own filed request → no button,
  server action refuses; reject someone else's with empty remark → refused.
- **U17. Each role sees the right list** *(High)*. I see my own requests;
  a supervisor also sees the requests naming them; an HR officer sees the
  whole Pending-HR queue plus every HR-decided record; each row shows
  status, dates, day count and remarks. Someone else's request is closed
  to me.
  *Test:* open `/leave/[id]` of employee-1's request as hr-2 before it
  reaches HR → bounced; as supervisor-1 (named) → opens; as admin → opens
  read-only.
- **U18. I fix a mistake while it is still with my supervisor** *(Medium)*.
  While **Pending supervisor** I can edit any field or delete the request
  (confirm + success). An edit must pass all the submit rules again; after
  that status the options are gone.
  *Test:* edit employee-1's Pending request to type Other without a reason
  → refused; fix it → saved; delete → row gone; on a Signed request no
  Edit/Delete anywhere.
- **U19. The admin sees everything, changes nothing** *(Medium)*. A
  newest-first table of all records with one Status filter; the detail
  page has no buttons for the admin.
  *Test:* as admin, rows for all staff appear; filter to Rejected by HR →
  only those; open a row → no action buttons; a hand-crafted POST of any
  leave action as admin → refused.
- **U20. Nothing happens without confirmation and a receipt** *(High)*.
  Every action (submit, edit, delete, sign, reject, send, approve, HR
  reject) asks for a native confirm first, then shows a green success
  message.
  *Test:* click through all eight actions once each: confirm appears,
  Cancel changes nothing, OK ends with a green banner.

## 4. Acceptance checklist

| Status | ID | Check | How to test |
|--------|----|-------|-------------|
| To do | AC-14 | Submit lands in my list (U9) | • As `employee-1@budiman.com`, New request: Annual leave, 2026-12-01→2026-12-03, Supervisor 1, no reason<br>• Green success; my home table shows the row, status "Pending supervisor", "3 days", supervisor "Supervisor 1"<br>• `npx prisma studio` → a `LeaveRequest` row with `submittedAt` set, status Pending supervisor |
| To do | AC-15 | Signer dropdown lists only eligible people (U10) | • As `employee-1`: dropdown = Supervisor 1, Supervisor 2 only<br>• As `supervisor-1`: only Supervisor 2 (never self)<br>• As `hr-1`: only HR 2<br>• As `admin@budiman.com`, type `/leave/new` → bounced to `/admin` |
| To do | AC-16 | A forged supervisor id is refused (U10, OWASP A01/A03) | • As employee-1, submit, edit the `supervisorId` in devtools to HR 1's id (different division) or to self, resend<br>• Server refuses with a validation error; no row is created |
| To do | AC-17 | Reason required for Other and Compassionate only (U11) | • Type Other, blank reason → inline "What the leave is for is required"<br>• Same with Compassionate → refused<br>• Reason filled → accepted<br>• Annual leave with blank reason → accepted |
| To do | AC-18 | End before start is refused (U12) | • Start 2026-12-05, end 2026-12-01 → inline error, no row |
| To do | AC-19 | Overlap with my own live requests is refused (U12) | • With employee-1's 2026-12-01→03 Pending, file 2026-12-02→04 → "overlaps an existing request" refused<br>• Reject (or delete) the first, file it again → accepted<br>• A row already Rejected/Deleted never blocks |
| To do | AC-20 | Only the named supervisor can sign (U13) | • As `supervisor-2`, employee-1's request is absent from their lists<br>• As `supervisor-1`: confirm → Signed, banner, signing date shown<br>• Replaying the Sign action after it is Signed → refused (status check)<br>• The requester never sees a Sign button and their action POST is refused |
| To do | AC-21 | Supervisor rejection needs a remark and tells the requester (U14) | • As supervisor-1: Reject with empty remark → refused<br>• Remark "Team blackout week" → Rejected by supervisor; employee-1's list and detail show status + remark |
| To do | AC-22 | Only the requester sends a Signed request (U15) | • On employee-1's Signed request: employee-1 sees Send to HR → confirm → Pending HR<br>• supervisor-1's view of the same request has no Send button; POST as supervisor-1 → refused<br>• Send while still Pending supervisor → refused |
| To do | AC-23 | HR decides; the decider is recorded; never their own (U16) | • As `hr-1`, approve the Pending-HR request → Approved; detail shows HR officer "HR 1" and a decision date<br>• As `hr-1` on a request **filed by hr-1**: no approve/reject button; POST the action → refused<br>• As `hr-2`, reject someone else's request with empty remark → refused; with remark → Rejected by HR, remark stored |
| To do | AC-24 | The visibility matrix holds (U17) | • As `employee-1`, open another user's `/leave/[id]` (e.g. filed by hr-1) → bounced<br>• As `supervisor-2`, open a request naming supervisor-1 → bounced<br>• As `hr-2`, open **employee-1's** Signed request before it is sent → bounced; after employee-1 sends it → opens<br>• As `admin`, any `/leave/[id]` → opens, no buttons |
| To do | AC-25 | The admin view is complete but inert (U19) | • As admin: every record listed newest-first (requester, division, type, dates, days, status, latest remark, HR decider)<br>• Status filter → Pending HR shows only those rows<br>• No buttons anywhere; a hand-crafted POST of sign/approve as admin → refused |
| To do | AC-26 | Edit and delete only while Pending supervisor (U18) | • As employee-1 on the Pending row: Edit → change to Other, blank reason → refused; add reason → saved, banner<br>• Edit dates to overlap another live request → refused<br>• Delete → confirm → row gone from list and database<br>• On a Signed row: no Edit/Delete; their POST actions → refused |
| To do | AC-27 | Confirm + success on every action (U20) | • For each of submit, edit, delete, sign, supervisor-reject, send-to-HR, approve, HR-reject: native confirm appears; Cancel = no change; OK = the state changes and a green banner shows |

## 5. Not included (for now)

- No leave balances or quotas (no annual-day allowance anywhere in the
  document)
- No notifications or inbox badges — the requester's own list is the status
  view, refreshed on demand
- No printable/paper-style view, no CSV export, no holiday calendar
- No withdrawals or a "Withdrawn" status beyond the agreed delete-while-
  Pending; no edit of a request after it leaves Pending supervisor
- No cross-division signers, no re-assigning a signer after submission
- No user administration (logins still come only from the seed script)
- Extra ideas stay Low priority and need a spec update first, per the
  document's FR-09
