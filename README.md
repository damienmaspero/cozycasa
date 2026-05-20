# Migrate the cozycasa frontend to Expo SDK 55

This document captures the plan for replacing the current Vite + React 19 SPA in
`src/web/` with an Expo (Expo Router) app targeting [Expo SDK 55][sdk-55],
while keeping the existing Node / `better-auth` API server unchanged.

[sdk-55]: https://expo.dev/changelog/sdk-55

## Scope / current state

The frontend today is a Vite + React 19 SPA in `src/web/` (`main.tsx`,
`App.tsx`, `auth-client.ts`) talking to a Node API in `src/server.ts` via
`better-auth`. The goal is to replace the Vite web app with an Expo app on
SDK 55, keeping the existing API unchanged and adding native (iOS/Android)
targets alongside web.

## Target stack (pinned to SDK 55)

- `expo` ~55, `react-native` 0.83, `react` 19.2, `react-dom` 19.2
- `expo-router` v7 with the new Native Tabs API
- New Architecture is mandatory in SDK 55 — no `newArchEnabled` toggle
- Min platforms: iOS 15.1+, Android 7 (API 24)+, Xcode 16.1+
- Keep `better-auth` 1.6.11; use `better-auth/react` on web and the same
  client on native (with a real `baseURL` instead of `window.location.origin`
  so it works off-DOM)
- Storage for native sessions: `expo-secure-store` wired into better-auth's
  storage hook

## PRs
Add Expo SDK 55 deps + app.json / babel.config.js / metro.config.js / tsconfig and an empty app/_layout.tsx that builds.
Port screens from src/web/ into app/ using RN primitives; add shared src/lib/auth-client.ts with platform-conditional storage.
Server-side: trustedOrigins + CORS for native; no changes to src/server.ts request handling.
Swap build scripts to expo export --platform web --output-dir dist; verify src/server.ts still serves it; verify npm run typecheck passes.
Remove Vite (vite.config.ts, root index.html, src/web/, tsconfig.web.json, vite + @vitejs/plugin-react deps); update README.
