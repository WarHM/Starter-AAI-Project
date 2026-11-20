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
