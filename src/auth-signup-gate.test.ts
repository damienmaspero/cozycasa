import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  SIGN_UP_DISABLED_ERROR,
  assertSignUpAllowedForUserCount,
  isSignUpAllowedForUserCount,
} from "./auth-signup-gate.ts";

describe("isSignUpAllowedForUserCount", () => {
  test("allows sign-up when the user table is empty", () => {
    assert.equal(isSignUpAllowedForUserCount(0), true);
  });

  test("disallows sign-up once at least one user exists", () => {
    assert.equal(isSignUpAllowedForUserCount(1), false);
    assert.equal(isSignUpAllowedForUserCount(42), false);
  });
});

describe("assertSignUpAllowedForUserCount", () => {
  test("does not throw when the user table is empty", () => {
    assert.doesNotThrow(() => assertSignUpAllowedForUserCount(0));
  });

  test("throws an APIError matching the built-in disabled-signup response", () => {
    let caught: unknown;
    try {
      assertSignUpAllowedForUserCount(1);
    } catch (err) {
      caught = err;
    }
    assert.ok(caught, "expected an error to be thrown");
    const err = caught as {
      status?: string;
      statusCode?: number;
      body?: { message?: string; code?: string };
    };
    // better-auth's APIError exposes the textual status ("BAD_REQUEST") and the
    // numeric statusCode (400). Assert both so the response shape stays in
    // lockstep with the built-in EMAIL_PASSWORD_SIGN_UP_DISABLED behaviour.
    assert.equal(err.status, "BAD_REQUEST");
    assert.equal(err.statusCode, 400);
    assert.equal(err.body?.message, SIGN_UP_DISABLED_ERROR.message);
    assert.equal(err.body?.code, SIGN_UP_DISABLED_ERROR.code);
  });
});
