# Suggestions

Proposed conventions and operational practices for CozyCasa. These follow from
the [Scope](./README.md#scope) section of the README. Items here
describe the **target state**; not all are implemented yet.

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
- **Deploy concurrency**: any workflow that calls `azure/webapps-deploy`
  against the production slot should set a `concurrency` group keyed on the
  App Service + slot, with `cancel-in-progress: false`. Kudu OneDeploy fails
  with `Conflict (CODE: 409)` if a previous deployment is still running, and
  cancelling mid-deploy can leave the SCM site locked, so queuing is the
  safer choice.
