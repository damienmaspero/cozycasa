# cozycasa

An [Expo SDK 55][sdk-55] (Expo Router) app talking to a Node /
[`better-auth`][better-auth] API server. Targets web, iOS, and Android from a
single React Native codebase.

[sdk-55]: https://expo.dev/changelog/sdk-55
[better-auth]: https://better-auth.com

## Stack

- `expo` ~55, `react-native` 0.83, `react` 19.2, `react-dom` 19.2
- `expo-router` v7 with the new Native Tabs API
- New Architecture (mandatory in SDK 55)
- Min platforms: iOS 15.1+, Android 7 (API 24)+, Xcode 16.1+
- `better-auth` 1.6.11 with `expo-secure-store` for native session storage
- Node API server in `src/server.ts` (unchanged from the original SPA setup)

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

## Migration history

The frontend was originally a Vite + React 19 SPA in `src/web/`. It was
migrated to Expo SDK 55 in a series of PRs:

1. Add Expo SDK 55 deps + `app.json` / `babel.config.cjs` / `metro.config.cjs`
   / `tsconfig` and an empty `app/_layout.tsx` that builds.
2. Port screens from `src/web/` into `app/` using RN primitives; add shared
   `src/lib/auth-client.ts` with platform-conditional storage.
3. Server-side: `trustedOrigins` + CORS for native; no changes to
   `src/server.ts` request handling.
4. Swap build scripts to `expo export --platform web --output-dir dist`;
   verify `src/server.ts` still serves it; verify `npm run typecheck` passes.
5. Remove Vite (`vite.config.ts`, root `index.html`, `src/web/`,
   `tsconfig.web.json`, `vite` + `@vitejs/plugin-react` deps); update README.
