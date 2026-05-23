import { betterAuth, type BetterAuthOptions } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { admin, organization } from "better-auth/plugins";
import { db } from "./db.ts";
import { buildCorsHeaders } from "./auth-cors.ts";

// Comma-separated list of user ids that should have unconditional admin
// access, supplied via the `BETTER_AUTH_ADMIN_USER_IDS` env var. The
// better-auth admin plugin treats any id in this list as an admin regardless
// of the user's `role` column, which matches the README scope ("a single
// admin (me) across both better-auth organizations").
const adminUserIds = (process.env.BETTER_AUTH_ADMIN_USER_IDS ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter((id) => id.length > 0);

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
    disableSignUp: true,
  },
  trustedOrigins: NATIVE_TRUSTED_ORIGINS,
  hooks: {
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
    admin({
      adminUserIds,
    }),
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
