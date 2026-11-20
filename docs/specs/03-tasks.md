# Login – Tasks

> **This file answers:** In what order do we build it, and how do we check each step?
> **Who:** The AI drafts it. You review it.
>
> Build one task at a time, in order. When a task is done, the AI changes its
> Status to Done. At the end, you check the whole app against the specs.
> If something is wrong, fix the spec first, then ask the AI to rebuild.

**Priority.** Every task is **High**, **Medium** or **Low**. Do High first.
Do Low only if time is left, and only if you ask.

| Status | # | Task | Priority | Checks (from requirements §4) |
|--------|---|------|----------|-------------------------------|
| Done | 1 | Create the database and the User table | High | — (prepares AC-13; design §1, §7) |
| Done | 2 | Seed the demo people | High | AC-13 (login part verified in task 3) |
| Done | 3 | Log in, and the four home pages | High | AC-01, AC-02, AC-03, AC-04, AC-09 |
| Done | 4 | Throttle failed logins | High | AC-08 |
| Done | 5 | Log out | High | AC-07 |
| Done | 6 | Proxy guard, signpost, and the 30-minute idle timeout | High | AC-05, AC-06, AC-10 |
| Done | 7 | Change my password | Medium | AC-11, AC-12 |
| Done | 8 | Whole-login check against the specs | High | All of AC-01…AC-13 |

---

## Task 1 – Create the database and the User table *(High)*

> One task = one small step you can finish and test on its own.

- **Goal:** SQLite + Prisma are wired up and the `User` table exists with
  exactly the fields from design §1.
- **Files:** `prisma/schema.prisma` (new), `src/lib/db.ts` (new, the shared
  Prisma client), `.env` + `.env.example` (`DATABASE_URL`), `.gitignore`
  (add `.env` and the SQLite file), `package.json` (`db:push` script).
- **Check:** (design §1, §7 — prepares AC-13)
  • Run `npm run db:push` → it reports the schema is in sync and creates the
  SQLite file next to the project
  • Run `npx prisma studio` → a `User` table is listed with `id`, `name`,
  `icNumber`, `email` (marked unique), `passwordHash`, `role`, `division`,
  `designation`, `createdAt`; zero rows
  • `.env` is not visible to `git status`
  • Trace: design §1 table, design §7 commands.

## Task 2 – Seed the demo people *(High)*

- **Goal:** `npm run db:seed` loads the six demo people from Reference B with
  `password123` stored as a bcrypt hash, and is safe to re-run.
- **Files:** `prisma/seed.ts` (new), `package.json` (`db:seed` script and
  prisma seed config pointing at `tsx`).
- **Check:** (AC-13, except the login step — that lands with task 3)
  • Delete the SQLite file, run `npm run db:push` then `npm run db:seed` →
  it reports 6 users created
  • Open `npx prisma studio` → the six people from Reference B with correct
  role, IC, division and designation; `passwordHash` values start with
  `$2a$`/`$2b$` (a hash, never `password123`)
  • Run `npm run db:seed` again → finishes cleanly, still exactly 6 users
  • Trace: design rule 12, Reference A + B; requirements §2 demo accounts.

## Task 3 – Log in, and the four home pages *(High)*

- **Goal:** A visitor can log in with a demo account and lands on their
  role's placeholder home page; bad credentials get one generic message.
- **Files:** `src/lib/session.ts` (new: sign/verify/read the `session`
  cookie, HMAC-SHA256 with `SESSION_SECRET`), `src/lib/auth.ts` (new:
  `getCurrentUser`, `getRequiredUser`), `src/lib/validation.ts` (new),
  `src/app/login/page.tsx` + `src/app/login/actions.ts` (new), the four
  home pages `src/app/employee|supervisor|hr|admin/page.tsx` and
  `src/components/RoleHome.tsx` (new), `.env`/`.env.example`
  (`SESSION_SECRET`), `src/app/page.tsx` (temporary redirect to `/login`).
- **Check:** (AC-01, AC-02, AC-03, AC-04, AC-09 — each page and the login
  action check the session server-side per design rule 9)
  • `/login` with `employee-1@budiman.com` / `password123` → lands on
  `/employee` showing "Employee 1", role "Employee"; repeat for all six
  demo accounts, each on its own home (AC-01)
  • Wrong password → "Invalid email or password", still on `/login` (AC-02);
  unknown email → the identical message (AC-03)
  • `employee1` (no `@`) or blank email → inline "…ending in @budiman.com"
  (AC-04)
  • With a valid session, edit the cookie in browser devtools (change userId
  or role) and reload a home page → back to `/login` (AC-09)
  • Trace: U1, U2, U6, U7; design rules 2, 3, 5, 6, 8, 9.

## Task 4 – Throttle failed logins *(High)*

- **Goal:** 10 failed attempts in 15 minutes (per email and per IP) are
  answered with a wait message, even for the correct password.
- **Files:** `src/lib/rate-limit.ts` (new), wiring in
  `src/app/login/actions.ts`.
- **Check:** (AC-08)
  • 10 wrong passwords for `employee-1@budiman.com` → each still shows
  "Invalid email or password"
  • 11th attempt → "Too many failed attempts — try again in 15 minutes"
  • The correct `password123` inside the window → same wait message
  • Wait out the window (or restart `npm run dev`) → login works again
  • Trace: U3; design rule 4 (OWASP A07).

## Task 5 – Log out *(High)*

- **Goal:** A "Log out" link on every home page ends the session and returns
  to the login page with a message; Back cannot revive the session.
- **Files:** `logout` server action in `src/app/login/actions.ts`,
  `src/components/RoleHome.tsx` (Log out link), message handling on
  `/login`.
- **Check:** (AC-07)
  • From `/employee`, click "Log out" → `/login` shows "You are logged out"
  • Press browser Back → redirected to `/login`, the home page does not
  reappear
  • Trace: U5; design rules 10.

## Task 6 – Proxy guard, signpost, and the 30-minute idle timeout *(High)*

- **Goal:** Before any page renders, the Next 16 proxy sends logged-out
  visitors to `/login` and wrong-role users to their own home; `/` signs
  people to the right place; every request reissues the cookie so 30 minutes
  of idleness (not of age) ends the session.
- **Files:** `src/proxy.ts` (new — note: Next 16 calls middleware *proxy*),
  reissue hook in `src/lib/session.ts`, `src/app/page.tsx` (signpost logic).
- **Check:** (AC-05, AC-06, AC-10)
  • Logged out, type `/admin` → `/login` (AC-10)
  • Logged in as `employee-1@budiman.com`, type `/hr`, `/supervisor`,
  `/admin` → bounced back to `/employee` (AC-10)
  • `/` while logged out → `/login`; while logged in as `hr-1@budiman.com`
  → `/hr` (AC-01 landing behaviour kept)
  • Log in and click around every ~10 minutes for 40 minutes → still logged
  in (AC-05)
  • Log in, leave it untouched 31 minutes, click any link → `/login` (AC-06)
  • Also re-run task 3's tampered-cookie check — the proxy must reject it
  before the page even renders (AC-09)
  • Trace: U4, U7; design rules 1, 7, 9 (OWASP A01).

## Task 7 – Change my password *(Medium)*

- **Goal:** A logged-in user can change their own password on
  `/change-password`, proving the current one.
- **Files:** `src/app/change-password/page.tsx` +
  `src/app/change-password/actions.ts` (new), link from
  `src/components/RoleHome.tsx`.
- **Check:** (AC-11, AC-12)
  • As `hr-1@budiman.com`: wrong current password → refused; new password of
  6 characters → refused; new ≠ confirm → refused (AC-11)
  • Correct values → success message; log out; `password123` is refused; the
  new password logs in (AC-12)
  • Change it back to `password123` so the demo data is shared again
  • As `employee-1@budiman.com`, you cannot change `hr-1`'s password: the
  action only touches the session's own user (design rule 11)
  • Trace: U8; design rules 5, 11.

## Task 8 – Whole-login check against the specs *(High)*

- **Goal:** The finished login module is verified end-to-end against both
  specs, and the repo is clean.
- **Files:** none new — fix anything the checks expose (spec first, then
  code).
- **Check:** (all of AC-01…AC-13)
  • Walk the whole acceptance checklist (requirements §4) with the demo
  accounts, ticking each row off — flip each AC's Status to Done
  • Confirm the "Not included" list is respected: no forgot-password, no
  lockout message beyond the rate-limit wait, no extra screens
  • `npm run lint` and `npm run build` pass
  • Every design §6 security bullet still holds (generic error, hashes,
  signed cookie flags, server re-checks in `login`, `logout`,
  `change-password`)
  • Trace: FR-10 in the HRMS document (secure by design), design §6.

---

# Leave Request – Tasks

> The build order for the leave module. Numbering continues the login tasks
> (1–8, all Done). Same rules: one task at a time, in order, High priority
> first; the AI flips Status to Done when the checks pass; something wrong →
> fix the spec first, then the code.
>
> The two Medium tasks (17, 18) sit after the High build-out and before the
> final check, matching the document's FR-08/FR-09 priorities.

| Status | # | Task | Priority | Checks (from requirements §4) |
|--------|---|------|----------|-------------------------------|
| To do | 9 | Create the LeaveRequest table | High | — (Leave-design §1; prepares AC-14) |
| To do | 10 | Shared rules: `src/lib/leave.ts` | High | — (traces Leave-design §2–§3; used by AC-14…AC-19) |
| To do | 11 | Submit a request — `/leave/new` | High | AC-14 (submit + banner part), AC-15, AC-16, AC-17, AC-18, AC-19 |
| To do | 12 | My lists and the detail page | High | AC-14 (list part), AC-24 (own + outsider part) |
| To do | 13 | The chosen supervisor signs or rejects | High | AC-20, AC-21, AC-27 (their part) |
| To do | 14 | The requester sends a Signed request to HR | High | AC-22, AC-27 (its part) |
| To do | 15 | The HR queue: approve or reject | High | AC-23, AC-24 (queue part), AC-27 (its part) |
| To do | 16 | Access-control sweep on pages and actions | High | AC-16, AC-20, AC-22, AC-23, AC-24, AC-25 (action part) |
| To do | 17 | Edit and delete while Pending supervisor | Medium | AC-26, AC-27 (their part) |
| To do | 18 | Admin: read-only table with Status filter | Medium | AC-24 (admin part), AC-25 (list part) |
| To do | 19 | Whole-module check against the specs | High | All of AC-14…AC-27 |

---

## Task 9 – Create the LeaveRequest table *(High)*

- **Goal:** The new table exists with exactly the Leave-design §1 fields;
  the login side is untouched.
- **Files:** `prisma/schema.prisma` (add `LeaveRequest` + the three named
  relations on `User`; **no new User columns**).
- **Check:** (Leave-design §1)
  • `npm run db:push` reports the schema in sync; the SQLite file gains the
  table
  • `npx prisma studio` → `LeaveRequest` lists `employeeId`, `supervisorId`,
  `leaveType`, `reason`, `startDate`, `endDate`, `status`,
  `supervisorRemark`, `hrOfficerId`, `hrRemark`, `submittedAt`, `signedAt`,
  `decidedAt`; zero rows
  • `User` still shows exactly the login columns — three relation entries
  only — and the six demo people are still there
  • Trace: Leave-design §1.

## Task 10 – Shared rules: `src/lib/leave.ts` *(High)*

- **Goal:** One source of truth for Reference C constants and the rules —
  validation, overlap, day count, visibility and permission predicates —
  so pages and actions never hand-roll them.
- **Files:** `src/lib/leave.ts` (new): `LEAVE_TYPES`, `STATUSES`,
  `validateRequest()`, `overlapExists()`, `dayCount()`, `canView()`,
  `canAct()`.
- **Check:** (Leave-design §2–§3)
  • `npm run build` and `npm run lint` pass
  • Smoke-test with `npx tsx` (throwaway, no file kept): `dayCount`
  2026-12-01→2026-12-03 = 3; `validateRequest` rejects end-before-start,
  a bad `YYYY-MM-DD`, blank reason on Other/Compassionate, and accepts
  Annual with blank reason; `overlapExists` finds a live-row overlap and
  ignores a Rejected row
  • Trace: Leave-design rules L3, L4, L5, L8, L9.

## Task 11 – Submit a request — `/leave/new` *(High)*

- **Goal:** A non-admin user files a valid request and it lands Pending
  supervisor with a success banner; every rule from Leave-design rule L3/L4
  is enforced server-side; the three role homes gain the **New leave
  request** button.
- **Files:** `src/app/leave/new/page.tsx`, `src/components/LeaveForm.tsx`,
  `src/app/leave/actions.ts` (`createLeave` only so far),
  `src/components/LeaveBanner.tsx`, links added in
  `src/components/RoleHome.tsx` (non-admin roles only), `src/proxy.ts`
  (`/leave/*` requires a session — login only; role checks live page-side
  per Leave-design §5, so the `/leave/new` page itself bounces Admin to
  `/admin`).
- **Check:** (AC-14 submit part, AC-15…AC-19)
  • As `employee-1@budiman.com`: Annual, 2026-12-01→2026-12-03,
  Supervisor 1 → green banner; row in `npx prisma studio` with status
  `Pending supervisor` and `submittedAt` (AC-14)
  • Dropdown contents per role: employee-1 → Supervisor 1/2; supervisor-1 →
  Supervisor 2 only; hr-1 → HR 2 only; as admin, `/leave/new` → `/admin`
  (AC-15)
  • Devtools: change `supervisorId` to HR 1's id or your own, resend →
  validation error, no row (AC-16)
  • Other/Compassionate with blank reason refused; Annual without reason
  accepted (AC-17); end before start refused (AC-18)
  • Second request overlapping a live one refused; accepted once the first
  is gone (AC-19 — if the delete path is not built yet, reject via
  `prisma studio` edit for this check)
  • Confirm dialog: Cancel → nothing happens (AC-27, submit part)
  • Trace: U9–U12; Leave-design rules L1, L3, L4, L10.

## Task 12 – My lists and the detail page *(High)*

- **Goal:** Each role home replaces "Nothing here yet" with **My leave
  requests** (type, dates, N days, status, chosen supervisor, latest
  remark, submitted — the remark column keeps FR-06's "with the status and
  remarks"); rows link to the detail page; `/leave/[id]` shows the full
  record read-only; outsiders are bounced. Action buttons come in tasks
  13–17.
- **Files:** `src/components/LeaveTable.tsx` (new),
  `src/app/leave/[id]/page.tsx` (new), the three home pages
  `src/app/employee|supervisor|hr/page.tsx`.
- **Check:** (AC-14 list part, AC-24 own + outsider part)
  • The request filed in task 11 now shows on employee-1's home table:
  status "Pending supervisor", "3 days", supervisor "Supervisor 1" (AC-14)
  • employee-1's home lists only their own rows, day count correct, status
  badge visible; supervisor-1's and hr-1's homes list their own submissions
  too (all non-admins file — ⚑ interview)
  • As employee-1, open `/leave/[id]` of a row filed by hr-1 → bounced;
  the row is absent from employee-1's lists
  • The detail page shows reason, dates + days, status, chosen supervisor,
  both remarks, submitted/signed/decided dates (nulls render as "—")
  • Trace: U17; Leave-design §4, §5, rule L8.

## Task 13 – The chosen supervisor signs or rejects *(High)*

- **Goal:** Only the user named as supervisor sees the request in
  **Awaiting my signature** on `/supervisor` and can Sign or Reject
  (remark required) with confirm + banner; the state machine's §2
  transitions 4–5 execute.
- **Files:** action `signLeave` / `rejectBySupervisorLeave` in
  `src/app/leave/actions.ts`; buttons on `src/app/leave/[id]/page.tsx`;
  **Awaiting my signature** section on `src/app/supervisor/page.tsx` and
  on `src/app/hr/page.tsx` (an HR colleague may be the named signer —
  ⚑ interview).
- **Check:** (AC-20, AC-21, AC-27)
  • As supervisor-1 (chosen): Sign → confirm → green banner; status
  `Signed`, `signedAt` set (prisma studio). As supervisor-2 the request
  appears nowhere; POSTing the action refuses (AC-20)
  • As `hr-1`, an hr-2-filed request naming hr-1 appears under **Awaiting
  my signature** on `/hr`, and hr-1 can sign it there (AC-20, ⚑ HR signs)
  • Replaying Sign on an already-Signed row → refused (status check, AC-20)
  • The requester sees no Sign button; their POST of it is refused (AC-20)
  • Reject with blank remark → inline refusal; with remark →
  `Rejected by supervisor`, remark + `decidedAt` stored; the requester's
  list/detail show the remark (AC-21)
  • Confirm Cancel → nothing changes (AC-27)
  • Trace: U13, U14; Leave-design §2 transitions 4–5, rules L5, L7, L10.

## Task 14 – The requester sends a Signed request to HR *(High)*

- **Goal:** Only the requester sees **Send to HR** on a Signed request;
  confirming moves it to Pending HR and into the shared queue.
- **Files:** action `sendToHr` in `src/app/leave/actions.ts`; button on
  `src/app/leave/[id]/page.tsx`.
- **Check:** (AC-22, AC-27)
  • As employee-1 on your Signed row: Send → confirm → status `Pending HR`
  • supervisor-1's view of the same row has no Send button; their POST →
  refused
  • Send on a still-Pending row → refused (status check)
  • Trace: U15; Leave-design §2 transition 6.

## Task 15 – The HR queue: approve or reject *(High)*

- **Goal:** `/hr` gains the **HR queue** (all Pending-HR rows except my
  own) and the list of HR-decided records; any HR officer approves (final,
  decider recorded) or rejects (remark required); never their own filing.
- **Files:** actions `approveLeave` / `rejectByHrLeave` in
  `src/app/leave/actions.ts`; queue + history sections on
  `src/app/hr/page.tsx`; buttons on `src/app/leave/[id]/page.tsx`.
- **Check:** (AC-23, AC-24 queue part, AC-27)
  • As hr-1: employee-1's Pending-HR row → Approve → `Approved`,
  `hrOfficerId` = hr-1, `decidedAt` set; detail shows "Decided by HR 1"
  • hr-2 also sees the same queue before it is decided (either officer,
  AC-24); after a decision it moves to the decided-records list
  • hr-1 files a request and hr-2 signs and sends it → it appears in
  **My leave requests**, never in the HR queue; hr-1 sees no approve/reject
  on it; POST → refused (AC-23, rule L5)
  • HR reject with blank remark → refused; with remark → `Rejected by HR`,
  `hrRemark` + `hrOfficerId` + `decidedAt` stored (AC-23)
  • Trace: U16; Leave-design §2 transitions 7–8, rules L5, L6, L7.

## Task 16 – Access-control sweep on pages and actions *(High)*

- **Goal:** Prove the guards, not just the happy paths: every page bounce
  and every action refusal in the Leave-design §4 matrix fires, including
  hand-crafted requests (OWASP A01, the FR-10 requirement).
- **Files:** none expected — fix whatever the sweep exposes (spec first if
  the spec is what's wrong).
- **Check:** (AC-16, AC-20, AC-22, AC-23, AC-24, AC-25 action part)
  • Logged out: `/leave/new` and any `/leave/[id]` → `/login`
  • Cross-role URL sweep: employee-1 opens a request filed by hr-1 →
  bounce; supervisor-2 opens a request naming supervisor-1 → bounce; hr-2
  opens employee-1's Signed not-yet-sent request → bounce (while a request
  filed by hr-1 naming hr-2 does open, for signing)
  • Hand-crafted POSTs (curl or devtools fetch, with each role's cookie):
  sign by non-signer, send by non-requester, decide by non-HR, **every
  action as Admin** → all refused, row unchanged
  • Status replays: sign twice, send twice, decide twice → second refused
  • Self-decisions: requester signing/deciding their own → refused
  • Trace: Leave-design §8 bullets, one by one.

## Task 17 – Edit and delete while Pending supervisor *(Medium)*

- **Goal:** The requester can fix or withdraw a mistake while the request
  is still Pending supervisor: `/leave/[id]/edit` reuses the form (all
  submit rules re-checked, overlap excluding itself) and a confirmed
  Delete removes the row. Gone once the status advances.
- **Files:** `src/app/leave/[id]/edit/page.tsx` (new), `LeaveForm.tsx`
  (edit mode), actions `updateLeave` / `deleteLeave` in
  `src/app/leave/actions.ts`, Edit/Delete buttons on
  `src/app/leave/[id]/page.tsx` (requester + Pending supervisor only).
- **Check:** (AC-26, AC-27)
  • Edit employee-1's Pending row to Other with blank reason → refused;
  add reason → saved + banner; the prisma row changed
  • Edit dates to overlap a live request → refused (overlap excludes the
  edited row itself: no false positive on unchanged dates)
  • Delete → confirm → row gone from lists and database; Cancel → still there
  • On a Signed row: no Edit/Delete rendered; POSTing either → refused
  • Someone else's POST → refused (their session, your row id)
  • Trace: U18; Leave-design §2 transitions 2–3, rule L9.

## Task 18 – Admin: read-only table with Status filter *(Medium)*

- **Goal:** `/admin` lists every record newest-first (requester, division,
  type, dates, days, status, latest remark, HR decider) with one Status
  filter; rows open the detail page with no buttons for Admin.
- **Files:** `src/app/admin/page.tsx` (grows), Status filter via
  `?status=`; detail page already hides buttons for Admin (verify).
- **Check:** (AC-24 admin part, AC-25 list part)
  • As admin: every record from all six users appears, newest first
  • `?status=Pending HR` → only those; "All" restores; a bogus status
  value → treated as All (no crash)
  • Open a row → full detail, zero buttons; every hand-crafted POST as
  admin still refused (re-check of task 16)
  • Trace: U19; Leave-design rule L11.

## Task 19 – Whole-module check against the specs *(High)*

- **Goal:** The finished leave module is verified end-to-end against
  requirements U9–U20 / AC-14…AC-27 and the leave design, and the repo is
  clean.
- **Files:** none new — fix anything the checks expose (spec first, then
  code).
- **Check:** (all of AC-14…AC-27)
  • Walk the leave acceptance checklist top to bottom with the demo
  accounts, flipping each AC's Status to Done (the six seeded users keep
  their seeded logins and `password123` unchanged; leave requests created
  during the walkthrough may stay — a small demo dataset is welcome)
  • One full golden path in one sitting: employee-1 files → supervisor-1
  signs → send to HR → hr-2 approves; hr-1 files → hr-2 signs → send →
  hr-1 blocked from deciding it, hr-2 decides (recorded)
  • The "Not included" list is respected: no balance display, no
  notifications, no print/CSV, no edit after Pending
  • `npm run lint` and `npm run build` pass
  • Leave-design §8 security bullets re-verified (per-record checks,
  server re-validation, no self-decisions, session-sourced decider,
  Prisma-only access)
  • Trace: FR-02…FR-08 and FR-10 of the HRMS document; the interview
  decisions marked ⚑.
