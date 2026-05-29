import { betterAuth, type BetterAuthOptions } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { admin, organization, username } from "better-auth/plugins";
import { db } from "./db.ts";
import { buildCorsHeaders } from "./auth-cors.ts";
import { assertSignUpAllowedForUserCount } from "./auth-signup-gate.ts";

// Origins trusted by better-auth in addition to `baseURL`. The app is a
// web-only Next.js application, so we trust the production web domains and the
// local Next.js dev server. Additional origins can be supplied via the
// `BETTER_AUTH_TRUSTED_ORIGINS` env var (handled by better-auth).
export const TRUSTED_ORIGINS = [
  // Production web domains.
  "https://www.thecozycasa.net",
  "https://thecozycasa.net",
  // Next.js dev server.
  "http://localhost:3000",
  "http://127.0.0.1:3000",
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
  trustedOrigins: TRUSTED_ORIGINS,
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
    // Add CORS response headers for trusted origins. The app is normally
    // served same-origin by Next.js, so CORS is not required for the first
    // party UI, but echoing these headers for trusted origins keeps any
    // cross-origin client (e.g. a future companion site) working without
    // changing route handlers.
    //
    // Note: this only attaches CORS headers to actual auth endpoint responses.
    // CORS preflight (OPTIONS) handling is out of scope here; the first-party
    // web UI is same-origin and does not issue preflight requests.
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
  databaseHooks: {
    user: {
      create: {
        // Bootstrap promotion: the very first sign-up is the only one allowed
        // (see `before` hook above and README "Scope"), and that user is the
        // initial admin. Without this hook the admin plugin's default `role`
        // of `"user"` would stick, and the new role gating below
        // (`allowUserToCreateOrganization` and the
        // `/api/auth/organization/create-member` handler) would then prevent
        // the bootstrap user from creating organizations or members,
        // leaving the app unusable. By promoting the first user to `admin`
        // we keep bootstrap working while everyone else (role `"user"`)
        // remains restricted. Runs after the admin plugin's own
        // `user.create.before` hook (root databaseHooks run last) so this
        // override wins — see `node_modules/better-auth/dist/db/with-hooks.mjs`.
        async before(user, ctx) {
          if (!ctx) return;
          const userCount = await ctx.context.adapter.count({ model: "user" });
          if (userCount === 0) {
            return { data: { ...user, role: "admin" } };
          }
        },
      },
    },
  },
  plugins: [
    admin(),
    username(),
    organization({
      // Restrict organization creation to non-`user` roles. The admin plugin's
      // default role for new sign-ups is `"user"`; only the bootstrap user
      // (promoted to `"admin"` above) or any explicitly elevated account is
      // allowed to create organizations. See
      // `node_modules/better-auth/dist/plugins/organization/routes/crud-org.mjs`
      // for how this option is consulted.
      allowUserToCreateOrganization(user) {
        return isElevatedRole((user as { role?: string | null }).role);
      },
      async sendInvitationEmail(data) {
        // Dev: just log invitations. Replace with real email provider in prod.
        console.log(
          `[invitation] org=${data.organization.name} to=${data.email} inviteId=${data.id}`,
        );
      },
    }),
  ],
};

/**
 * Returns true when the given role is permitted to create organizations or
 * organization members. Role `"user"` (and any missing/unknown role) is
 * rejected; every other role (e.g. `"admin"`) is accepted.
 */
export function isElevatedRole(role: string | null | undefined): boolean {
  return typeof role === "string" && role.trim() !== "" && role !== "user";
}

export const auth = betterAuth(authOptions);
