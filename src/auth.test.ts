import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
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
    assert.ok(TRUSTED_ORIGINS.includes("https://www.thecozycasa.net"));
  });

  it("trusts the bare production web origin before canonical redirect", () => {
    assert.ok(TRUSTED_ORIGINS.includes("https://thecozycasa.net"));
  });
});
