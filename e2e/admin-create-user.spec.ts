import { expect, test } from "@playwright/test";

// Tests for the admin POST /admin/create-user endpoint.
//
// The endpoint is provided by the better-auth `admin` plugin and requires the
// caller to be authenticated as an admin user (either via `adminUserIds` env
// var or a session with `role: "admin"`).  The Playwright env does NOT set
// `BETTER_AUTH_ADMIN_USER_IDS`, so:
//
//  - an unauthenticated request → 401 UNAUTHORIZED
//  - a session with the default `role: "user"` → 403 FORBIDDEN
//
// The success path (admin creates a new user with a fake @cozycasa.local email
// and a username) is exercised manually / via the UI by the real admin whose
// user ID is listed in `BETTER_AUTH_ADMIN_USER_IDS` on the production server.

test.describe.serial("admin create-user endpoint", () => {
  const bootstrapUser = {
    email: "admin-flow-bootstrap@example.test",
    password: "bootstrap-password",
    name: "Bootstrap Admin",
    username: "bootstrapadmin",
  };

  test("returns 401 when called without a session", async ({ request }) => {
    const response = await request.post("/api/auth/admin/create-user", {
      data: {
        email: "noauth@cozycasa.local",
        password: "somepassword",
        name: "No Auth",
      },
    });

    expect(
      response.status(),
      `unauthenticated request should be rejected; body=${await response.text()}`,
    ).toBe(401);
  });

  test("returns 403 when called by a non-admin session", async ({
    request,
  }) => {
    // Bootstrap: sign up the first (and only allowed) user so we have a
    // valid session to test with.
    const signUpRes = await request.post("/api/auth/sign-up/email", {
      data: bootstrapUser,
    });
    expect(
      signUpRes.status(),
      `bootstrap sign-up should succeed; body=${await signUpRes.text()}`,
    ).toBe(200);

    // Sign in so the request context has a valid session cookie/token.
    const signInRes = await request.post("/api/auth/sign-in/username", {
      data: {
        username: bootstrapUser.username,
        password: bootstrapUser.password,
      },
    });
    expect(
      signInRes.status(),
      `sign-in should succeed; body=${await signInRes.text()}`,
    ).toBe(200);

    // Attempt to create a user as a non-admin (role: "user") → FORBIDDEN.
    // Playwright's APIRequestContext persists cookies between requests in the
    // same test, so the session established above is automatically included.
    const createRes = await request.post("/api/auth/admin/create-user", {
      data: {
        email: "newuser@cozycasa.local",
        password: "newuserpassword",
        name: "New User",
        data: { username: "newuser" },
      },
    });

    expect(
      createRes.status(),
      `non-admin create-user should be forbidden; body=${await createRes.text()}`,
    ).toBe(403);
  });
});
