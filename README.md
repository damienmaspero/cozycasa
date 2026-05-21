# cozycasa

An [Expo SDK 55][sdk-55] (Expo Router) app talking to a Node /
[`better-auth`][better-auth] API server. Targets web, iOS, and Android from a
single React Native codebase.

[sdk-55]: https://expo.dev/changelog/sdk-55
[better-auth]: https://better-auth.com

## Scope

CozyCasa is a private app for two families (mine and a friend's). There is a
single admin (me) across both [`better-auth`][better-auth] organizations, and
total user count is on the order of ~10. The app is **invite-only**: public
sign-up is disabled and members join via organization invitations.

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

## Operations

- **Backups**: the SQLite database file (`node:sqlite`) lives on the server's
  persistent disk and is backed up off-box on a regular schedule.

See [`SUGGESTIONS.md`](./SUGGESTIONS.md) for proposed conventions and
operational practices that follow from the scope above.
