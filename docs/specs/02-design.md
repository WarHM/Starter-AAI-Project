# Login – Design

> **This file answers:** How is the app put together? (data, rules, screens,
> where the code lives)
> **Who:** The AI drafts it. You review all of it.
>
> If this file and the requirements disagree, fix the requirements first,
> then this file.

## 1. Tables

### `User` – one row per person who can log in

| Field | Type | Required? | What it holds |
|-------|------|-----------|---------------|
| `id` | number | auto | Unique number for the row |
| `name` | text | yes | Full name, e.g. "Employee 1" |
| `icNumber` | text | yes | Identity card number, format `xx-xxxxxx` (two digits, hyphen, six digits), e.g. `00-148888` |
| `email` | text | yes | Work email, always ends `@budiman.com`. **Unique.** Used to log in |
| `passwordHash` | text | yes | bcryptjs hash of the login password. Never the plain password |
| `role` | text | yes | One of: `Employee`, `Supervisor`, `HR`, `Admin`. One role per user |
| `division` | text | yes | One of the divisions in Reference A |
| `designation` | text | yes | One of the designations listed under the user's division (Reference A) |
| `createdAt` | date | auto | Set automatically when the account is created |

Divisions and designations are stored as text and checked against the fixed
lists in Reference A. A proper `Division` table comes later with FR-02
(choosing a supervisor from the same division), when the app needs to query
them. There is no other table in this module: the session lives in the
cookie, not in the database (interview decision, and AC-09).

## 2. Business rules

1. **One door for everyone.** No page of the app works without a valid
   session, except `/login` itself (rule FR-01.1 in the HRMS document).
2. **Login is by email.** The email must be valid, end in `@budiman.com`, and
   match a `User` row; the password must match its `passwordHash`. Both parts
   are checked on the server, whatever the form already checked on the client.
3. **One generic error.** A wrong email or a wrong password both answer
   "Invalid email or password" — never which part was wrong (AC-02, AC-03).
4. **Guessing is throttled.** 10 failed attempts per 15 minutes, counted per
   email address and per IP. During the window every attempt answers
   "Too many failed attempts — try again in 15 minutes", even the correct
   password (AC-08). The counter lives in the server's memory: it resets on
   restart, which is fine for a single-laptop demo.
5. **Passwords are never plain text.** bcryptjs hashes at rest (demo
   `password123` is stored as a hash). Hashes are never shown in the UI, and
   plain passwords are never logged or saved anywhere.
6. **The session is one signed cookie.** The cookie `session` holds
   `{ userId, role, exp }`, signed HMAC-SHA256 with `SESSION_SECRET` from
   `.env`. A tampered cookie fails the signature check and is treated as
   logged out (AC-09). The cookie is `httpOnly`, `sameSite=lax`, `path=/`,
   and `secure` in production.
7. **30 minutes idle, sliding.** `exp` is 30 minutes ahead; on every request
   the app reissues the cookie with a new expiry — via the proxy for page
   loads and via the server actions for form posts (AC-05, AC-06). No
   activity for 30 minutes means the next request finds an expired cookie and
   sends the user to `/login`.
8. **Role decides the home page and everything they see.** `Employee` →
   `/employee`, `Supervisor` → `/supervisor`, `HR` → `/hr`, `Admin` →
   `/admin`. The role in the cookie must match the role on the `User` row at
   every check — the cookie is a convenience, the database is the truth.
9. **Every page is guarded, every action checks again.** The proxy redirects
   logged-out visitors to `/login` and wrong-role users to their own home
   page (AC-10). Every server action and every role page then re-verifies the
   session itself and the user's role before doing or showing anything — the
   proxy is the fast first gate, never the only one.
10. **Logout clears the cookie.** "Log out" is a server action that deletes
    the `session` cookie and lands on `/login` with "You are logged out".
    Because every role page then re-checks the session, the browser Back
    button cannot bring a dead session back (AC-07).
11. **Change password proves the old one.** A logged-in user changes their own
    password only: current password must verify against `passwordHash`, the
    new one must be at least 8 characters, and new + confirm must match
    (AC-11, AC-12). Only their own row is touched.
12. **Seed is idempotent.** `npm run db:seed` creates the six demo people and
    the Reference A lists only if missing, so re-running it never duplicates
    rows (AC-13).

## 3. Technology

| Part | Choice | In plain words |
|------|--------|----------------|
| Web framework | Next.js 16 (App Router) + TypeScript | Screens and server logic in one project; server actions mean no separate API |
| Database | SQLite with Prisma | One file, no server to install; Prisma talks to it |
| Styling | Tailwind CSS 4 | Styles sit next to each screen |
| Session | Signed cookie (`session`) signed HMAC-SHA256, per rules 6–7 | Simple and safe; no session table; tampering is detectable |
| Passwords | bcryptjs | Hashed at rest, compared with `bcrypt.compare` |
| Guards | `src/proxy.ts` + re-check in pages/actions | Next.js 16 renamed middleware to **proxy** — this is the version-correct name for the file that redirects before a page renders |
| Validation | Server-side checks in every action; client-side `type="email"` for speed only | The browser check is a convenience; the server never trusts it |

## 4. Screens (routes)

| Route | Who | What it shows | Status |
|-------|-----|---------------|--------|
| `/` | Anyone | Signpost: logged in → own home page; logged out → `/login` | To do |
| `/login` | Logged out | Email + password form, sign-in button. Shows "Invalid email or password", the rate-limit message, and "You are logged out" when arriving from logout. Inline error if the email is not a valid `@budiman.com` address | To do |
| `/employee` | Employee only | Placeholder home: "Employee 1 — Employee", a "Nothing here yet" note, a "Change password" link and the Log out link. The real form comes with FR-02 | To do |
| `/supervisor` | Supervisor only | Same shape as `/employee` for Supervisor 1/2. Queue comes with FR-03 | To do |
| `/hr` | HR only | Same shape, for HR 1/2. Queue comes with FR-05 | To do |
| `/admin` | Admin only | Same shape, for Admin. Read-only list comes with FR-08 | To do |
| `/change-password` | Any logged-in role | Current password, new password, confirm; inline errors; success message afterwards (FR-07 style) | To do |

The four home pages share one layout component (name, role, "Change
password", "Log out"), so the guard rules and the layout exist once.

There is no route for logout or login themselves — both are server actions
posted by forms, per the "server actions, no separate API" choice.

### Visual style (agreed from the picture)

Appearance only — no behaviour changes. Every screen uses the same
language as the reference mockup:

- **Backdrop:** full-screen diagonal blue gradient — deep navy at the
  corners (around `#2e4a76`), lighter steel blue toward the middle
  (around `#5b7fb2`).
- **Card:** one centred card per screen (max width ~384 px), large corner
  radius (~28 px), translucent white-over-blue fill with a subtle border,
  soft deep shadow, generous padding (~24 px) and ~24 px gaps between
  elements.
- **Title band:** inside the top of each card, a darker blue rounded
  block holding the screen title in bold white uppercase with wide letter
  spacing (e.g. "BUDIMAN HRMS", the user's name and role, "Change
  password"). Text stays our own wording, restyled.
- **Inputs:** pill-shaped (fully rounded), transparent background, thin
  white border, placeholder in uppercase white/60 centred; text typed by
  the user is normal case, left as typed. Visible labels move to
  screen-reader-only text so the look matches the picture.
- **Primary button:** pill, light steel-blue fill (around `#a9c3de`),
  white bold uppercase letterspaced label, slightly lighter on hover,
  half-opacity when disabled.
- **Text links:** white at ~80% opacity, underline on hover; placed under
  the card the way "Forgot password?" sits in the picture (our "Back to
  home" / "Change password").
- **Messages:** errors in light red (`red-200`) under the relevant input;
  success and "You are logged out" in light green (`green-200`) on a
  translucent strip inside the card.
- **Not adopted, on purpose:** "Remember me", "Forgot password?" and
  "Create account" from the picture — they remain excluded per
  01-requirements.md §5 (interview + requirements).

## 5. Where the code lives

| Folder / file | What's in it |
|---------------|--------------|
| `prisma/schema.prisma` | The `User` model and the SQLite datasource (`DATABASE_URL`) |
| `prisma/seed.ts` | Reference A lists + the six demo people from Reference B, hashed with bcryptjs; runs through `tsx`; idempotent (rule 12) |
| `src/proxy.ts` | Next 16's proxy (the old `middleware.ts`): verifies the cookie, redirects guests to `/login` and wrong roles to their home, reissues the cookie for the sliding expiry. Fast gate only — not the only check |
| `src/lib/db.ts` | The one Prisma client the whole app shares |
| `src/lib/session.ts` | Sign, verify, read and reissue the `session` cookie (rules 6–7). The only place that touches the cookie |
| `src/lib/auth.ts` | Server-side helpers: `getCurrentUser()` and `getRequiredUser(role)` used by every page and action (rule 9) |
| `src/lib/rate-limit.ts` | In-memory failed-attempt counter, 10 per 15 min per email and per IP (rule 4) |
| `src/lib/validation.ts` | Email / IC / password checks shared by the forms (rules 2, 5, 11) |
| `src/app/layout.tsx` | Existing root layout, wraps everything |
| `src/app/page.tsx` | The `/` signpost (replaces the starter text) |
| `src/app/login/page.tsx` | The login form and its messages |
| `src/app/login/actions.ts` | Server actions: `login` (verify → rate limit → set cookie → redirect to home) and `logout` (clear cookie → `/login`) |
| `src/app/employee/page.tsx` | Employee placeholder home |
| `src/app/supervisor/page.tsx` | Supervisor placeholder home |
| `src/app/hr/page.tsx` | HR placeholder home |
| `src/app/admin/page.tsx` | Admin placeholder home |
| `src/app/change-password/page.tsx` | The change-password form |
| `src/app/change-password/actions.ts` | Server action: verify current, check new + confirm, update hash |
| `src/components/RoleHome.tsx` | Shared home layout: name, role, "Nothing here yet", links |
| `.env` (git-ignored) + `.env.example` | `DATABASE_URL` (path to the SQLite file) and `SESSION_SECRET` (the signing key). `.env.example` shows the names only — never real secrets |
| `package.json` | Adds `db:push` (`prisma db push`) and `db:seed` (`prisma db seed`) scripts |

## 6. Security (in plain words)

- **Every page checks the visitor.** `src/proxy.ts` sends logged-out visitors
  to `/login` and wrong-role users to their own home page; each role page
  then checks again through `getRequiredUser`, so a page can never be added
  "behind the gate but not behind the check" (OWASP A01).
- **Every action checks again on the server.** `login`, `logout` and
  `change-password` re-verify the signed cookie and the user's role in the
  database before doing anything — the proxy can be bypassed by design, so
  it is never trusted (OWASP A01).
- **Forged sessions fail.** The cookie is HMAC-SHA256-signed with
  `SESSION_SECRET`, which lives in `.env` (not in git, not in the repo); any
  edit to the cookie's contents breaks the signature (AC-09, OWASP A02).
- **The login form leaks nothing.** Same message for wrong email and wrong
  password; no hint of which accounts exist; 10 tries per 15 minutes per
  email/IP before a wait (AC-02/03/08, OWASP A07).
- **Secrets stay secret.** Passwords only ever exist as bcrypt hashes in the
  database; they are never displayed, and plain passwords are never logged.
  Hashes never leave the server (OWASP A02/A09).
- **Nothing is trusted from the browser.** Emails, ICs and passwords are
  re-validated on the server in every action; the client checks are only
  politeness (OWASP A03).
- **No hand-written SQL.** All database access goes through Prisma, which
  parameterises every query (OWASP A03).
- **The session cookie is locked down.** `httpOnly` (JavaScript can't read
  it), `sameSite=lax`, `path=/`, `secure` in production; logout deletes it and
  pages re-check, so Back can't revive a session (AC-07).
- **Rate limiting and password-change proof on actions.** Changing a password
  requires proving the current one (rule 11, OWASP A07); failed logins are
  throttled (rule 4).

## 7. Commands

| Command | What it does |
|---------|--------------|
| `npm install` | Install the pinned dependencies |
| `npm run db:push` | Create/update the SQLite file from `prisma/schema.prisma` |
| `npm run db:seed` | Load Reference A + the six demo people (safe to re-run) |
| `npm run dev` | Start the app at http://localhost:3000 |
| `npm run build` | Production build (also catches type errors) |
| `npm start` | Serve the production build |
| `npm run lint` | Run ESLint |

---

# Reference

> Long lists you look things up in (fixed choices, demo data). Keep them here
> so the rules above stay short.

## Reference A. Fixed lists

- **Roles:** Employee, Supervisor, HR, Admin
- **Division → designations:** (the Admin entry covers the admin's own
  division/designation, as in Reference B and the HRMS document)
  - **Finance:** Finance Manager, Accountant, Accounts Clerk
  - **Human Resources:** HR Manager, HR Officer, HR Assistant
  - **Information Technology:** IT Manager, Software Developer, IT Support Officer
  - **Operations:** Operations Manager, Operations Supervisor, Operations Executive
  - **Marketing:** Marketing Manager, Marketing Executive, Marketing Assistant
  - **Admin:** Admin Manager
- **Email domain:** always `@budiman.com`
- **IC format:** `xx-xxxxxx` (two digits, hyphen, six digits)
- **Minimum new password length:** 8 characters

## Reference B. Demo data (from the HRMS document; all passwords are `password123`, stored hashed)

| Email | Name | IC No. | Role | Division | Designation |
|-------|------|--------|------|----------|-------------|
| `employee-1@budiman.com` | Employee 1 | 00-148888 | Employee | Finance | Accounts Clerk |
| `supervisor-1@budiman.com` | Supervisor 1 | 00-157777 | Supervisor | Finance | Finance Manager |
| `supervisor-2@budiman.com` | Supervisor 2 | 00-166666 | Supervisor | Finance | Accountant |
| `hr-1@budiman.com` | HR 1 | 00-175555 | HR | Human Resources | HR Officer |
| `hr-2@budiman.com` | HR 2 | 00-184444 | HR | Human Resources | HR Officer |
| `admin@budiman.com` | Admin | 00-193333 | Admin | Admin | Admin Manager |

---

# Leave Request – Design

> **This file answers:** How is the leave module put together? (data, rules,
> screens, where the code lives)
> **Who:** Drafted by the AI from the HRMS document §5–§7 and the interview
> of 20/11/2026. You review all of it.
>
> Follows the login design above; nothing here changes it. The login §1 note
> that promised "a proper Division table comes later with FR-02" is
> **revised by the interview**: divisions stay text on `User`, validated
> against Reference A; the supervisor dropdown queries the `User` table.

## 1. Tables

### `LeaveRequest` – one row per request (new)

| Field | Type | Required? | What it holds |
|-------|------|-----------|---------------|
| `id` | number | auto | Unique number for the row |
| `employeeId` | number → `User.id` | yes | The requester — any non-Admin user (⚑ interview: Supervisors and HR file too) |
| `supervisorId` | number → `User.id` | yes | The chosen signer. Server check: same division as the requester, role `Supervisor` or `HR`, never the requester (⚑ interview) |
| `leaveType` | text | yes | One of Reference C (five types) |
| `reason` | text | when required | "What the leave is for" — the document's *Other leave type* field. Required non-empty when `leaveType` is **Other** or **Compassionate** (⚑ interview); max 500 characters |
| `startDate` | text `YYYY-MM-DD` | yes | First leave day. Calendar dates (no times); weekends count |
| `endDate` | text `YYYY-MM-DD` | yes | Last leave day. Not before `startDate` |
| `status` | text | yes | One of the six Reference C statuses, stored verbatim |
| `supervisorRemark` | text | when required | The supervisor's reason — required exactly when the supervisor rejects |
| `hrOfficerId` | number → `User.id` | when decided | The HR user who approved/rejected; set by the server from the session, never from the form |
| `hrRemark` | text | when required | The HR reason — required exactly when HR rejects |
| `submittedAt` | date-time | auto | Set when the form is accepted |
| `signedAt` | date-time | auto | Set when the supervisor signs |
| `decidedAt` | date-time | auto | Set when the request reaches a final status (Approved or either Rejected) |

Day count is **derived, not stored**: whole days inclusive
(`endDate − startDate + 1`), computed by `src/lib/leave.ts`.

Dates are stored as validated `YYYY-MM-DD` text (not `DateTime`) so a
calendar day means the same thing at every hour and time zone — this is a
date-only form, and text avoids the SQLite/UTC drift that `DateTime` brings.

The `User` model gains the three named back-relations Prisma requires for
`employeeId` / `supervisorId` / `hrOfficerId`. **No new User columns** —
division and designation stay text, checked against Reference A (revising
the login §1 note, per the interview).

## 2. The state machine

Statuses and allowed moves — anything not in this table is refused:

| # | From → To | Who may do it | Preconditions | Effects |
|---|-----------|---------------|---------------|---------|
| 1 | (new) → **Pending supervisor** | requester (role Employee, Supervisor or HR) via `/leave/new` | full validation (rule L3); no overlap (rule L4); confirm | `submittedAt`; success banner |
| 2 | **Pending supervisor** → same | requester via `/leave/[id]/edit` | every submit rule re-checked, overlap query excluding this row; confirm | fields updated |
| 3 | **Pending supervisor** → (deleted) | requester, confirm dialog | status still Pending supervisor | row deleted |
| 4 | **Pending supervisor** → **Signed** | the user in `supervisorId` only | requester ≠ signer (L5); confirm | `signedAt` |
| 5 | **Pending supervisor** → **Rejected by supervisor** | the user in `supervisorId` only | non-empty remark; confirm | `supervisorRemark`, `decidedAt` |
| 6 | **Signed** → **Pending HR** | the requester only | confirm | row joins the HR queue |
| 7 | **Pending HR** → **Approved** | any `HR`-role user ≠ requester (L5); either officer | confirm | `hrOfficerId` (from session), `decidedAt` |
| 8 | **Pending HR** → **Rejected by HR** | any `HR`-role user ≠ requester | non-empty remark; confirm | `hrRemark`, `hrOfficerId`, `decidedAt` |

Rejection by supervisor and rejection by HR are separate finals — a
supervisor-rejected request never re-enters the flow; the requester files
again as a new request (the document has no resubmit/reopen).

## 3. Business rules

1. **L1 — Six statuses, verbatim.** Display strings are exactly Reference C,
   held as constants in `src/lib/leave.ts` — never typed by hand at call
   sites.
2. **L2 — Roles, from the database.** Who may act comes from the live `User`
   row (login rule 8 still applies), not from the form or cookie alone.
   Admin performs no leave action anywhere, ever.
3. **L3 — Server re-validates every field on submit *and* edit**: `leaveType`
   in Reference C; `reason` non-empty (≤ 500 chars) when Other/Compassionate;
   dates match `YYYY-MM-DD`, are real calendar dates, and end ≥ start;
   the chosen supervisor is a same-division user with role Supervisor or HR
   and is not the requester. Client-side checks are politeness only (login
   design §3 Validation, OWASP A03).
4. **L4 — No double-booking.** A submit or edit is refused if the requester
   already has a request whose status is Pending supervisor, Signed,
   Pending HR or **Approved** and whose dates overlap
   (`NOT (endDate < newStart OR startDate > newEnd)`). An edit excludes
   its own row. Rejected rows never block (AC-19).
5. **L5 — No self-decisions.** The person who filed a request can never be its
   signer or its HR decider — checked server-side in every action even
   though the dropdown already hides the option (OWASP A01). The document
   only demands that the HR decider be recorded, so the signer of a request
   *may* be the HR officer who later decides it (allowed, recorded).
6. **L6 — Either HR officer decides the queue**, and `hrOfficerId` is taken from
   the verified session — the form never names the decider (AC-23).
7. **L7 — Remarks are rejections' shadow.** `supervisorRemark` / `hrRemark` are
   required exactly when their stage rejects, and are simply never set on
   an approval.
8. **L8 — One viewer per record.** Pages and actions both consult the shared
   predicates in `src/lib/leave.ts` (L8) before showing or changing
   anything — the same code answers "can this user see / act on this row"
   for every surface.
9. **L9 — Delete is the requester's undo only** — hard delete, only while
   Pending supervisor, with the standard confirm. After that, history is
   immutable: no one edits or deletes any record (admin included).
10. **L10 — Confirm first, banner after** (FR-07): every action button carries
    the native confirm; on success the page reloads with `?ok=<key>` and
    the shared banner component prints the matching green message.
    Cancel means the action never reaches the server.
11. **L11 — Admin is a window, not a hand.** Admin pages render data only; no
    action component is ever rendered for Admin, and every action re-checks
    the role server-side (AC-25).

## 4. Who can see and do what (matrix)

| Surface | Employee | Supervisor | HR | Admin |
|---------|----------|------------|----|-------|
| Own requests (own rows) | see, edit/delete while Pending, send when Signed | same | same | — |
| Requests naming me as supervisor | — | see; sign / reject while Pending | see; sign / reject while Pending (HR colleagues pick each other) | — |
| Pending-HR queue | — | — | see all; approve/reject (not my own) | — |
| HR-decided records (Approved / Rejected by HR) | — | — | see all | — |
| Every record | — | — | — | see (newest first, status filter) |
| Someone else's request | bounce | bounce | bounce unless queue/decided | open read-only |

## 5. Screens (routes)

| Route | Who | What it shows | Status |
|-------|-----|---------------|--------|
| `/employee` | Employee only | "My leave requests" table (type, dates, N days, status, chosen supervisor, latest remark, submitted) + **New leave request** button — replaces the "Nothing here yet" placeholder of login §4 | To do |
| `/supervisor` | Supervisor only | Two sections: **Awaiting my signature** (rows naming me, Pending) and **My leave requests** (my own rows) + New button | To do |
| `/hr` | HR only | Four sections: **Awaiting my signature** (rows naming me — HR colleagues pick each other), **HR queue** (all Pending HR, not my own filings), **Decided by HR**, **My leave requests**; + New button | To do |
| `/admin` | Admin only | Every record, newest first (requester, division, type, dates, days, status, latest remark, HR decider), one Status filter (`?status=`); rows link to the read-only detail | To do |
| `/leave/new` | Emp / Supervisor / HR (Admin bounced to `/admin`) | Form: leave type select; reason textarea (label marks it required for Other/Compassionate); start & end date inputs; supervisor select filled server-side with eligible signers; Submit (confirm) | To do |
| `/leave/[id]` | per matrix §4, checked per record | Full record: requester, chosen supervisor, type, reason, dates + day count, status badge, both remarks, submitted/signed/decided dates, HR decider. Action buttons render only for the allowed viewer + status: Sign / Reject+remark, Send to HR, Approve / Reject+remark, Edit / Delete | To do |
| `/leave/[id]/edit` | requester only, status Pending supervisor | Pre-filled form + **Delete request** (confirm). Every other viewer and every later status → bounced/refused | To do |

Rows link to `/leave/[id]`; every action is a server action posted from
those pages (no separate API, per the technology choice).

**Guards:** `src/proxy.ts` keeps guarding the four role homes as before;
the `/leave/*` routes require a valid session of any role, and role/record
checks run inside the pages and actions via `getRequiredUser()` (login
design §5) and the predicates in `src/lib/leave.ts` — the proxy stays the
fast first gate, never the authority (login rule 9).

Visual language: exactly the login design's blue-card style — tables and
forms use pill inputs, the title band carries the screen name, status
badges and the green `green-200` success strip follow the same palette.

## 6. Technology (only what the login module doesn't already cover)

| Part | Choice | In plain words |
|------|--------|----------------|
| Data | Prisma `LeaveRequest` model on the same SQLite file | One more table, same `db:push` flow |
| Shared rules | `src/lib/leave.ts` | The single source for statuses, types, validation, overlap, day count and the can-view/can-act predicates |
| Actions | Server actions in `src/app/leave/actions.ts` | Eight actions: create, update, delete, sign, supervisor-reject, send-to-HR, approve, hr-reject |
| Lists | Server components reading Prisma | No client-side fetching; tables render on the server |

## 7. Where the code lives (new files)

| Folder / file | What's in it |
|---------------|--------------|
| `prisma/schema.prisma` | + `LeaveRequest` model with the three named `User` relations (no new User columns) |
| `src/lib/leave.ts` | Reference C constants, `validateRequest()`, `overlapExists()`, `dayCount()`, `canView()`, `canAct()` — used by every page and action |
| `src/app/leave/actions.ts` | The eight server actions; each: verify session → load row → `canAct` → validate → mutate → `revalidatePath` → redirect with `?ok=` |
| `src/app/leave/new/page.tsx` | The submit form |
| `src/app/leave/[id]/page.tsx` | Detail page + status-appropriate action buttons |
| `src/app/leave/[id]/edit/page.tsx` | Edit form + Delete |
| `src/components/LeaveForm.tsx` | The form shared by new and edit |
| `src/components/LeaveTable.tsx` | The shared requests table (columns switch by role context; status and the latest remark always show — FR-06 "with the status and remarks") |
| `src/components/LeaveBanner.tsx` | The `?ok=` success strip |
| `src/app/employee|supervisor|hr|admin/page.tsx` | Placeholder bodies replaced by the role's tables/buttons (files exist; content grows) |

## 8. Security (in plain words)

- **Per-record authorization everywhere.** Every page and every one of the
  eight actions loads the row and asks `canView`/`canAct` before
  rendering or mutating — ids from the URL or form are never trusted
  (OWASP A01, AC-16/20/22/23/25).
- **Server re-validation.** Type, reason, dates, signer eligibility and
  overlap are enforced in the actions regardless of what the form sent
  (OWASP A03, AC-16…AC-19).
- **No self-decisions, no admin hands.** Signer ≠ requester and HR decider
  ≠ requester server-side; every action refuses the Admin role and any
  role the state machine doesn't name (OWASP A01/A07, AC-20/23/25).
- **State-machine enforced transitions.** An action checks the row's
  current status before mutating, so a replayed or hand-crafted request
  on a stale status is refused (AC-20/22).
- **The decider comes from the session**, never from form data (AC-23).
- **Prisma only, no raw SQL; remarks are length-capped; React escapes all
  rendered text** — remarks and reasons are plain text with no HTML
  interpretation (OWASP A03/A05).
- **Session rules carry over unchanged** — actions re-verify the signed
  cookie (login rules 6–7, 9).

## 9. Commands

Unchanged from the login design §7: `npm run db:push` picks up the new
table, `npm run db:seed` is untouched (no new seed data needed), then
`npm run dev`.

---

# Reference C. Leave fixed lists

- **Leave types:** Annual leave, Maternity leave, Unpaid leave,
  Compassionate leave, Other
  - `reason` required for **Other** and **Compassionate** (⚑ interview);
    optional elsewhere
- **Statuses (stored and displayed verbatim):** `Pending supervisor`,
  `Signed`, `Pending HR`, `Approved`, `Rejected by supervisor`,
  `Rejected by HR` — the last three are final
- **Eligible signers:** same-division users with role `Supervisor` or `HR`,
  never the requester (⚑ interview)
- **Date format:** `YYYY-MM-DD` text; day count inclusive of both dates;
  weekends count; no holiday calendar; no maximum length (⚑ interview)
