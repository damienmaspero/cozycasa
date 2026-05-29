A [Next.js][nextjs] (App Router, React Server Components) web app with a
[`better-auth`][better-auth] backend folded into the same deployable. Targets
the web only.

[nextjs]: https://nextjs.org
[better-auth]: https://better-auth.com

## Scope

CozyCasa is a private app for two families (mine and a friend's). There is a
single admin (me) across both [`better-auth`][better-auth] organizations.
Appart from me, there is only 1 member account per family. All real people from each family are using the same respective account.
Past the first user, public sign-up is disabled and the admin creates each
organization member account directly with a username and password before
adding it to the right organization. The very first sign-up is allowed when
the `user` table is empty so the initial admin can bootstrap the app; every
subsequent `/sign-up/email` call is rejected with the same
`EMAIL_PASSWORD_SIGN_UP_DISABLED` error better-auth uses when sign-up is
disabled outright.

This deliberately small scope drives the operational choices below — things
like rate limiting, complex CI matrices, staging environments, and heavy
observability stacks are intentionally out of scope.

## Stack

- `next` 16 (App Router + React Server Components), `react` 19.2, `react-dom` 19.2
- File-based routing under `app/`; interactive UI uses `"use client"` components
- `better-auth` 1.6.11 with cookie-based web sessions
- Node.js 24 with the native SQL API (`node:sqlite`) for the database layer
- API implemented as Next.js Route Handlers (Node.js runtime), no separate server

## Project layout

- `app/` — Next.js App Router routes and API Route Handlers
  - `app/layout.tsx`, `app/page.tsx`, `app/calendar/page.tsx` — pages
  - `app/api/auth/[...all]/route.ts` — better-auth catch-all handler
  - `app/api/bookings/`, `app/api/bootstrap-status/`,
    `app/api/auth/organization/create-member/` — REST endpoints
- `src/lib/` — shared client code (`auth-client.ts`, calendar UI in
  `src/lib/calendar/`)
- `src/auth.ts`, `src/db.ts`, `src/bookings-*.ts`, `src/organization-members.ts`,
  `src/bootstrap-status.ts` — server-side logic imported by Route Handlers
- `instrumentation.ts` — runs better-auth and bookings migrations at startup
- `next.config.mjs` — Next.js config (apex→www canonical redirect)
- `tsconfig.json` — Next.js app TS config; `tsconfig.server.json` — server TS config

## Scripts

- `npm run dev` — start the Next.js dev server
- `npm run build` — `next build`
- `npm start` — `next start` (production server; respects `PORT`)
- `npm run typecheck` — type-check the server and the Next.js app
- `npm test` — run the Node `node:test` suite for `src/server-utils.ts`, `src/auth-cors.ts`, `src/auth-signup-gate.ts`, `src/bootstrap-status.ts`, and `src/auth.ts`

## Operations

- **Backups**: the SQLite database file (`node:sqlite`) lives on the server's
  persistent disk and is backed up off-box on a regular schedule.
- **Deploys**: the `main_cozycasa.yml` workflow builds with `next build`
  (`output: "standalone"`), assembles the self-contained `.next/standalone`
  output (copying in `.next/static` and rewriting the deployed `package.json`
  `start` script to `node server.js`), and deploys it to Azure App Service via
  `azure/webapps-deploy@v3` (Kudu OneDeploy). Azure's Oryx startup runs
  `npm start`, which now launches the standalone server directly and avoids the
  `next` CLI / `node_modules/.bin` symlink that Azure's repackaged
  `node_modules` could not resolve (`next: not found`). The start command lives
  in the deployed `package.json` because the `startup-command` action input is
  rejected with publish-profile auth. Runs are serialized with a `concurrency`
  group on the target slot so overlapping pushes cannot trigger the
  `Conflict (CODE: 409)` Kudu returns when a previous deployment is still in
  progress.

## License

This project is proprietary and `UNLICENSED`. The repository is public for
visibility only; except for the limited rights required to view it on GitHub
and fork it within GitHub under GitHub's Terms of Service, no permission is
granted to use, copy, modify, distribute, or create derivative works from this
code without prior written permission from the copyright holder.
