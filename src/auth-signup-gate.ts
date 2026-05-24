import { APIError } from "better-auth/api";

// Error code/message intentionally mirror the built-in `better-auth`
// "EMAIL_PASSWORD_SIGN_UP_DISABLED" response (see
// `node_modules/better-auth/dist/api/routes/sign-up.mjs`) so clients see the
// same error shape they would with `emailAndPassword.disableSignUp: true`.
export const SIGN_UP_DISABLED_ERROR = {
  message: "Email and password sign up is not enabled",
  code: "EMAIL_PASSWORD_SIGN_UP_DISABLED",
} as const;

/**
 * Returns true when sign-up should be permitted for the given user count.
 * The repo is invite-only (see README "Scope"), but the very first user must
 * be able to sign up so the app can be bootstrapped — there is no other way
 * to create the initial admin account.
 */
export function isSignUpAllowedForUserCount(userCount: number): boolean {
  return userCount === 0;
}

/**
 * Throws an `APIError` matching better-auth's built-in
 * `EMAIL_PASSWORD_SIGN_UP_DISABLED` response when sign-up is not allowed for
 * the given user count. Returns normally when sign-up is allowed.
 */
export function assertSignUpAllowedForUserCount(userCount: number): void {
  if (!isSignUpAllowedForUserCount(userCount)) {
    throw new APIError("BAD_REQUEST", SIGN_UP_DISABLED_ERROR);
  }
}
