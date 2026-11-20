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
