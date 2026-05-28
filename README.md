An [Expo SDK 55][sdk-55] (Expo Router) app talking to a Node /
[`better-auth`][better-auth] API server. Targets web, iOS, and Android from a
single React Native codebase.

[sdk-55]: https://expo.dev/changelog/sdk-55
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

- `expo` ~55, `react-native` 0.83, `react` 19.2, `react-dom` 19.2
- `expo-router` v7 with the new Native Tabs API
- New Architecture (mandatory in SDK 55)
- Min platforms: iOS 15.1+, Android 7 (API 24)+, Xcode 16.1+
- `better-auth` 1.6.11 with `expo-secure-store` for native session storage
- Node.js 24 with the native SQL API (`node:sqlite`) for the database layer
- Node API server in `src/server.ts`

## Project layout

- `app/` — Expo Router routes (entry is `expo-router/entry`)
- `src/lib/` — shared client code (e.g. `auth-client.ts` with
  platform-conditional storage)
- `src/server.ts`, `src/auth.ts`, `src/db.ts` — Node API server and
  `better-auth` configuration
- `app.json`, `babel.config.cjs`, `metro.config.cjs` — Expo / Metro config
- `tsconfig.json` — Expo app TS config; `tsconfig.server.json` — server TS config

## Scripts

- `npm run dev:api` — run the Node API server with `--watch`
- `npm run dev:expo` — start the Expo dev server (web / iOS / Android)
- `npm run build` — `expo export --platform web --output-dir dist`
- `npm start` — run the Node API server (serves the exported web build from
  `dist/`)
- `npm run typecheck` — type-check the server and Expo app
- `npm test` — run the Node `node:test` suite for `src/server-utils.ts`, `src/auth-cors.ts`, `src/auth-signup-gate.ts`, and `src/bootstrap-status.ts`

## Native API URL

Web builds call the same origin that served the app. Native iOS/Android builds
call `EXPO_PUBLIC_API_URL` when it is set, and otherwise fall back to
`https://www.thecozycasa.net` so a prebuilt Android app can reach the deployed
API.

For local Android API testing, set `EXPO_PUBLIC_API_URL` before starting or
building Expo. Use `http://10.0.2.2:3000` for an Android emulator, or your
computer's LAN IP for a physical device; `localhost` points at the device, not
your computer. Restart Expo/rebuild after changing `EXPO_PUBLIC_` variables
because Expo inlines them at build time.

## Operations

- **Backups**: the SQLite database file (`node:sqlite`) lives on the server's
  persistent disk and is backed up off-box on a regular schedule.
- **Deploys**: the `main_cozycasa.yml` workflow deploys to Azure App Service
  via `azure/webapps-deploy@v3` (Kudu OneDeploy). Runs are serialized with a
  `concurrency` group on the target slot so overlapping pushes cannot trigger
  the `Conflict (CODE: 409)` Kudu returns when a previous deployment is still
  in progress.

## License

This project is proprietary and `UNLICENSED`. The repository is public for
visibility only; except for the limited rights required to view it on GitHub
and fork it within GitHub under GitHub's Terms of Service, no permission is
granted to use, copy, modify, distribute, or create derivative works from this
code without prior written permission from the copyright holder.
