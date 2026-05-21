# Suggestions

Proposed conventions and operational practices for CozyCasa. These follow from
the [Scope](./README.md#scope) section of the README. Items here
describe the **target state**; not all are implemented yet.

## Conventions

- **Invite-only access**: open sign-up stays disabled in `better-auth`; new
  members join via organization invitations only.

## Operations

Because the app is small and self-hosted, operational concerns are kept
deliberately minimal:

- **Environment variables**: copy `.env.example` to `.env` and fill in
  required values (`BETTER_AUTH_SECRET`, `DATABASE_URL`, base URL, etc.). The
  server should validate required env vars at boot and fail fast with a clear
  message if any are missing or malformed.
- **Seeding**: a one-shot, idempotent seed script creates the admin user and
  the two organizations on a fresh database. Re-running it should be safe.
- **CI**: GitHub Actions runs `npm ci`, `npm run typecheck`, and `npm run
  build` on pull requests. There is no test suite by design; tests are added
  ad-hoc when a flow proves prone to regressions.
