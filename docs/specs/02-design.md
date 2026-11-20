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
