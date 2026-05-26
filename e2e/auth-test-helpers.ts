import { expect, type APIResponse } from "@playwright/test";

export const AUTH_ORIGIN = "http://localhost:3000";

export async function expectDisabledSignUpResponse(
  response: APIResponse,
): Promise<void> {
  expect(response.status(), "sign-up should be rejected").toBe(400);
  const body = (await response.json()) as {
    code?: string;
    message?: string;
  };
  expect(body.code).toBe("EMAIL_PASSWORD_SIGN_UP_DISABLED");
  expect(body.message).toBe("Email and password sign up is not enabled");
}
