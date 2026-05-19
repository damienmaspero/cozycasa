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

## Plan

1. **Scaffold the Expo app**
   - Use `create-expo-app` (SDK 55 template) into a new `app/` workspace at
     the repo root, so the existing `src/server.ts` API stays put.
   - Adopt the SDK 55 template layout: code under `app/src/app` (Expo Router)
     with config files at the workspace root.
   - Convert the repo to an npm workspaces layout (`packages: ["app"]` or
     `app` + root API) so `npm install` at the root installs both.

2. **Configure the project**
   - `app.json` / `app.config.ts`: name, slug, scheme (`cozycasa://`), iOS
     bundle id, Android package, web output `static`, plugins:
     `expo-router`, `expo-secure-store`.
   - Enable typed routes in `expo-router` config.
   - Keep New Architecture on (default in 55); do not opt into Hermes v1 yet
     (requires building RN from source — defer).
   - Add `metro.config.js` only if we need workspace/symlink resolution.

3. **Routing & shell (Expo Router v7 + Native Tabs)**
   - Root `_layout.tsx` providing a session context and `<Stack>`.
   - `(auth)` group with `sign-in.tsx` / `sign-up.tsx` for unauthenticated
     users.
   - `(app)` group using the new Native Tabs API for the signed-in shell
     (Home, Organizations, Account).
   - Auth gate in the root layout that redirects based on `useSession()`.

4. **Port screens from `src/web/App.tsx`**
   - Split the current monolithic `App.tsx` into:
     - `sign-in.tsx` / `sign-up.tsx` (replaces `AuthForms`)
     - `(app)/index.tsx` for "signed in as…" (replaces `SignedIn`)
     - `(app)/organizations/index.tsx` (list) and
       `(app)/organizations/new.tsx` (create) (replaces `Organizations`)
   - Replace DOM elements with React Native primitives: `View`, `Text`,
     `TextInput`, `Pressable`, `FlatList`, `ActivityIndicator`. Drop inline
     `style={{ ... }}` CSS in favor of `StyleSheet` (NativeWind optional).
   - Form handling stays the same shape; just swap `<form onSubmit>` for
     `Pressable onPress` calling the same `signIn.email` / `signUp.email` /
     `organization.create` / `organization.list` APIs.

5. **Better-auth client adjustments**
   - Move `auth-client.ts` into `app/src/lib/auth-client.ts`.
   - Replace `window.location.origin` with an env-driven `baseURL` from
     `process.env.EXPO_PUBLIC_API_URL` (required on native; web can still
     default to the current origin when running under `expo export --platform
     web` behind the API).
   - Configure better-auth's storage to use `expo-secure-store` on native and
     the default cookie/localStorage flow on web (platform-split via
     `Platform.OS`).
   - Confirm `organizationClient()` works unchanged.

6. **Server-side adjustments (minimal)**
   - In `src/server.ts`, add the native dev origin(s) and the Expo web origin
     to better-auth's trusted/allowed origins / CORS so the native app and
     the web bundle (served from a different port during dev) can
     authenticate.
   - Allow cookie auth for the web bundle and bearer/token-style for native
     if better-auth requires it (otherwise leave cookies as-is — better-auth
     supports a mobile-friendly flow with secure-store).
   - No DB schema changes.

7. **Scripts and dev workflow**
   - Root `package.json` scripts:
     - `dev:api` (unchanged) — Node API on its current port
     - `dev:app` → `expo start` inside `app/`
     - `dev:web` → `expo start --web` (replaces Vite)
     - `build:web` → `expo export --platform web` (replaces `vite build`);
       have `src/server.ts` serve the exported `dist/` directory the same
       way it serves Vite output today.
   - Remove `vite`, `@vitejs/plugin-react`, `index.html`, `tsconfig.web.json`,
     `vite.config.ts`, and `src/web/` once parity is achieved.

8. **TypeScript**
   - Use Expo's `expo/tsconfig.base` in `app/tsconfig.json`.
   - Keep root `tsconfig.json` for the Node server; drop `tsconfig.web.json`.
   - Update root `typecheck` script to run both.

9. **CI / setup**
   - Update `.github/workflows/copilot-setup-steps.yml` to `npm ci` at the
     root (workspaces will install `app/` too). **Do not** install any Expo
     skills bundle.
   - The existing `main_cozycasa.yml` deploy workflow needs its build step
     changed from `vite build` to `expo export --platform web`, and its
     artifact path updated to the new `dist/` location.

10. **Validation**
    - `npm run typecheck` clean.
    - `expo start --web` renders sign-in and signed-in flows against the
      local API.
    - `expo start` on an iOS simulator and Android emulator: sign-in,
      session persistence across reload (secure-store), create/list orgs.
    - Production web bundle served by `src/server.ts` works end-to-end as
      before.

## Out of scope

- Hermes v1 opt-in (defer; needs from-source RN build)
- Live Activities / widgets
- `expo-av` → `expo-video` / `expo-audio` (not used)
- The Expo skills bundle (explicitly excluded)

## Migration order (small, reviewable PRs)

1. Add `app/` scaffold + workspaces, no behavior change to existing site.
2. Port auth screens; run web via Expo behind the existing server.
3. Port organizations screens; reach parity.
4. Remove Vite and `src/web/`; switch deploy workflow to Expo export.
5. Wire up native targets (secure-store storage, EAS config) — optional
   follow-up.
