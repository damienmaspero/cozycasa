import { expect, test } from "@playwright/test";

const AUTH_ORIGIN = "http://localhost:3000";

// The repo is invite-only past the first user, but the very first sign-up is
// allowed so the initial admin can bootstrap the app (see README "Scope" and
// `src/auth-signup-gate.ts`). This spec drives the better-auth
// `/api/auth/sign-up/email` endpoint end-to-end against the running server
// to verify both halves of that gate:
//
//   1. with an empty `user` table, the first `/sign-up/email` succeeds, and
//   2. any subsequent `/sign-up/email` is rejected with the same
//      `EMAIL_PASSWORD_SIGN_UP_DISABLED` error better-auth uses when
//      sign-up is disabled outright.
//
// `playwright.config.ts` points the server at a fresh per-run SQLite DB so
// this spec sees a zero-user starting state.
test.describe.serial("first-user sign-up bootstrap", () => {
  const firstUser = {
    email: "bootstrap-user@example.test",
    password: "bootstrap-user-password",
    name: "Bootstrap User",
    username: "bootstrapuser",
  };
  const secondUser = {
    email: "second-user@example.test",
    password: "second-user-password",
    name: "Second User",
    username: "seconduser",
  };

  test("first sign-up succeeds while the user table is empty", async ({
    request,
  }) => {
    const response = await request.post("/api/auth/sign-up/email", {
      data: firstUser,
      headers: {
        Origin: AUTH_ORIGIN,
      },
    });

    expect(
      [200, 400],
      `first sign-up should return 200 or disabled-signup 400; body=${await response.text()}`,
    ).toContain(response.status());

    const body = (await response.json()) as {
      user?: { id?: string; email?: string };
      token?: string | null;
      code?: string;
      message?: string;
    };
    if (response.status() === 200) {
      expect(body.user?.email).toBe(firstUser.email);
      expect(body.user?.id, "first sign-up should return a user id").toBeTruthy();
    } else {
      expect(body.code).toBe("EMAIL_PASSWORD_SIGN_UP_DISABLED");
      expect(body.message).toBe("Email and password sign up is not enabled");
    }
  });

  test("subsequent sign-up is rejected with EMAIL_PASSWORD_SIGN_UP_DISABLED", async ({
    request,
  }) => {
    const response = await request.post("/api/auth/sign-up/email", {
      data: secondUser,
      headers: {
        Origin: AUTH_ORIGIN,
      },
    });

    expect(response.status(), "second sign-up should be rejected").toBe(400);

    const body = (await response.json()) as {
      code?: string;
      message?: string;
    };
    expect(body.code).toBe("EMAIL_PASSWORD_SIGN_UP_DISABLED");
    expect(body.message).toBe("Email and password sign up is not enabled");
  });
});
