import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { DEFAULT_NATIVE_API_BASE_URL } from "./api-base-url.ts";
import { isElevatedRole, TRUSTED_ORIGINS } from "./auth.ts";

describe("isElevatedRole", () => {
  it("rejects the default 'user' role from the admin plugin", () => {
    // The better-auth admin plugin assigns role 'user' by default to every
    // new sign-up. Users with this role must not be able to create
    // organizations or organization members (see README "Scope").
    assert.equal(isElevatedRole("user"), false);
  });

  it("rejects missing or empty roles", () => {
    assert.equal(isElevatedRole(null), false);
    assert.equal(isElevatedRole(undefined), false);
    assert.equal(isElevatedRole(""), false);
    assert.equal(isElevatedRole("   "), false);
  });

  it("accepts 'admin' and other elevated roles", () => {
    assert.equal(isElevatedRole("admin"), true);
    assert.equal(isElevatedRole("owner"), true);
  });
});

describe("TRUSTED_ORIGINS", () => {
  it("trusts the canonical production web origin for cookie-backed auth requests", () => {
    assert.equal(new Set(TRUSTED_ORIGINS).has("https://www.thecozycasa.net"), true);
  });

  it("trusts the bare production web origin before canonical redirect", () => {
    assert.equal(new Set(TRUSTED_ORIGINS).has("https://thecozycasa.net"), true);
  });

  it("trusts the Azure test API origin used by native fallback builds", () => {
    assert.equal(new Set(TRUSTED_ORIGINS).has(DEFAULT_NATIVE_API_BASE_URL), true);
  });
});
