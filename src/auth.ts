import { betterAuth, type BetterAuthOptions } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { admin, organization, username } from "better-auth/plugins";
import { db } from "./db.ts";
import { buildCorsHeaders } from "./auth-cors.ts";
import { assertSignUpAllowedForUserCount } from "./auth-signup-gate.ts";

// Origins trusted by better-auth in addition to `baseURL`. We add the native
// deep-link scheme (matches `expo.scheme` in app.json) and the Expo / Metro web
// dev server so that requests from iOS/Android and the Expo web bundler are
// accepted by better-auth's origin check. Additional origins can be supplied
// via the `BETTER_AUTH_TRUSTED_ORIGINS` env var (handled by better-auth).
const NATIVE_TRUSTED_ORIGINS = [
  // Native deep-link scheme.
  "cozycasa://",
  // Expo Go / dev client deep links.
  "exp://",
  // Expo / Metro web dev server.
  "http://localhost:8081",
  "http://127.0.0.1:8081",
];

export const authOptions: BetterAuthOptions = {
  database: db,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    // Sign-up is gated by the `before` hook below instead of better-auth's
    // built-in `disableSignUp` flag. The hook permits sign-up only when the
    // `user` table is empty so the very first admin can bootstrap the app;
    // afterwards it rejects with the same `EMAIL_PASSWORD_SIGN_UP_DISABLED`
    // error that `disableSignUp: true` would produce. See README "Scope" —
    // public sign-up closes after the first user.
    disableSignUp: false,
  },
  trustedOrigins: NATIVE_TRUSTED_ORIGINS,
  hooks: {
    // Bootstrap gate: allow sign-up only when there are zero users. Runs
    // before the built-in `/sign-up/email` handler (which the `username`
    // plugin also routes through, see
    // `node_modules/better-auth/dist/plugins/username/index.mjs`) so a
    // populated `user` table rejects sign-up with the same error code as
    // better-auth's built-in `disableSignUp`.
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") return;
      const userCount = await ctx.context.adapter.count({ model: "user" });
      assertSignUpAllowedForUserCount(userCount);
    }),
    // Add CORS response headers for trusted origins so the Expo web bundler
    // (and any other allowed cross-origin client) can call the auth API
    // without modifying `src/server.ts` request handling. Native iOS/Android
    // do not enforce CORS, but echoing these headers is harmless for them.
    //
    // Note: this only attaches CORS headers to actual auth endpoint responses.
    // CORS preflight (OPTIONS) handling is intentionally out of scope for
    // this PR — the migration plan forbids changes to `src/server.ts`
    // request handling, and native clients (the target of this PR) do not
    // issue preflight requests.
    after: createAuthMiddleware(async (ctx) => {
      const origin = ctx.request?.headers.get("origin") ?? null;
      const isTrusted = origin
        ? ctx.context.isTrustedOrigin(origin, { allowRelativePaths: false })
        : false;
      const requestedHeaders =
        ctx.request?.headers.get("access-control-request-headers") ?? null;
      const headers = buildCorsHeaders({ origin, isTrusted, requestedHeaders });
      if (!headers) return;
      for (const [name, value] of Object.entries(headers)) {
        ctx.setHeader(name, value);
      }
    }),
  },
  plugins: [
    admin(),
    username(),
    organization({
      async sendInvitationEmail(data) {
        // Dev: just log invitations. Replace with real email provider in prod.
        console.log(
          `[invitation] org=${data.organization.name} to=${data.email} inviteId=${data.id}`,
        );
      },
    }),
  ],
};

export const auth = betterAuth(authOptions);
