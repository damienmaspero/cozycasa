import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { createAuthClient } from "better-auth/react";
import { adminClient, organizationClient, usernameClient } from "better-auth/client/plugins";
import { resolveApiBaseURL } from "@/src/api-base-url";

/**
 * Minimal async key/value storage interface used to persist the better-auth
 * bearer token across launches. better-auth itself doesn't require this on
 * web (cookies handle session) but native has no cookie jar in fetch, so we
 * persist the `set-auth-token` header value and replay it as `Authorization:
 * Bearer …` on subsequent requests.
 */
export interface AuthStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

const webStorage: AuthStorage = {
  async getItem(key) {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  },
  async setItem(key, value) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
  },
  async removeItem(key) {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
  },
};

const nativeStorage: AuthStorage = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

/**
 * Platform-conditional storage: `expo-secure-store` on iOS/Android,
 * `window.localStorage` on web. Exported so other modules can stash user
 * preferences alongside the auth token using the same backing store.
 */
export const storage: AuthStorage =
  Platform.OS === "web" ? webStorage : nativeStorage;

const TOKEN_KEY = "cozycasa.auth.token";

/**
 * Resolve the API base URL.
 * - On web we talk to the same origin that served the app.
 * - On native we use `EXPO_PUBLIC_API_URL` when set, otherwise the production
 *   HTTPS API so Android/iOS builds created without local env still work.
 */
function resolveBaseURL(): string | undefined {
  return resolveApiBaseURL({
    envApiURL: process.env.EXPO_PUBLIC_API_URL,
    platformOS: Platform.OS,
    webOrigin: typeof window !== "undefined" ? window.location.origin : undefined,
  });
}

export const apiBaseURL = resolveBaseURL();

export const authClient = createAuthClient({
  baseURL: apiBaseURL,
  plugins: [adminClient(), organizationClient(), usernameClient()],
  fetchOptions: {
    // Include cookies on web; on native this is a no-op but keeps behaviour
    // predictable when running under react-native-web.
    credentials: "include",
    auth: {
      type: "Bearer",
      token: async () => (await storage.getItem(TOKEN_KEY)) ?? "",
    },
    onSuccess: async (ctx) => {
      const token = ctx.response.headers.get("set-auth-token");
      if (token) {
        await storage.setItem(TOKEN_KEY, token);
      }
    },
  },
});

export const { signIn, signUp, signOut, useSession, organization } = authClient;
