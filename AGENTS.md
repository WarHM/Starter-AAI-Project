# Project rules

## What this is

Budiman HRMS – the Leave Request module. It replaces the company's paper
leave process: employees submit requests, a supervisor signs them, an HR
officer decides, and an admin views everything read-only. The brief is
`docs/Agentic AI - HRMS Doc.pdf` — it is the source of truth.

## Built with

- Next.js 16 (App Router), TypeScript, React 19, Tailwind CSS 4
- SQLite with Prisma (the database is one file, no server to install)
- Login with a signed session cookie; passwords hashed with bcryptjs
- Server actions for forms; no separate API
- Follow OWASP Top 10 (https://top10.owasp.org/2025/) in everything built

## Run it

- `npm install`, then `npm run dev` → http://localhost:3000 (Node >= 20.9)
- Other commands: `npm run build`, `npm start`, `npm run lint`

## Where things live

- `docs/Agentic AI - HRMS Doc.pdf` – the project document
- `docs/templates/` – blank spec files to copy from
- `docs/specs/` – the live specs: 01-requirements, 02-design, 03-tasks
- `src/app/` – the Next.js app: pages and server actions

## How to work on it

- Spec-driven: agree the specs in `docs/specs/` first, build from them, then
  check the result against them. Something wrong? Fix the spec first, then
  rebuild.
- Build one task at a time from 03-tasks.md, in order, High priority first.
  Login comes first. Mark a task Done when its checks pass.
- Every commit message must be a conventional commit, e.g. `feat: add login
  page`, `fix: validate leave dates`, `docs: update design spec`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
