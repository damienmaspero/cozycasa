import { createAuthClient } from "better-auth/react";
import {
  adminClient,
  organizationClient,
  usernameClient,
} from "better-auth/client/plugins";

/**
 * Resolve the API base URL. The app is served same-origin by Next.js, so on
 * the client we talk to `window.location.origin`. During server rendering
 * there is no origin; better-auth only needs the base URL for browser calls,
 * so `undefined` (relative requests) is fine there.
 */
function resolveBaseURL(): string | undefined {
  return typeof window !== "undefined" ? window.location.origin : undefined;
}

export const apiBaseURL = resolveBaseURL();

export const authClient = createAuthClient({
  baseURL: apiBaseURL,
  plugins: [adminClient(), organizationClient(), usernameClient()],
  fetchOptions: {
    // Web sessions are cookie-based; include credentials so the session
    // cookie is sent with every request.
    credentials: "include",
  },
});

export const { signIn, signUp, signOut, useSession, organization } =
  authClient;
