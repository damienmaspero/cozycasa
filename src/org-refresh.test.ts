import { strict as assert } from "node:assert";
import { test } from "node:test";
import { shouldRefetchOrgsOnUserChange } from "./org-refresh.ts";

// Regression: better-auth's org/active-org queries are not invalidated when the
// signed-in user changes, so after signing out and signing in as a different
// user (without a full reload) the previous user's organizations stay cached.
// `useActiveOrg` must refetch when the user id changes to a new defined value,
// otherwise the new user sees an organization they don't belong to.

test("refetches when the user id changes to a different user", () => {
  assert.equal(shouldRefetchOrgsOnUserChange("direz-user", "rochmann-user"), true);
});

test("refetches on the first defined user id (corrects a remounted stale cache)", () => {
  assert.equal(shouldRefetchOrgsOnUserChange(null, "rochmann-user"), true);
  assert.equal(shouldRefetchOrgsOnUserChange(undefined, "rochmann-user"), true);
});

test("does not refetch while the same user stays signed in", () => {
  assert.equal(shouldRefetchOrgsOnUserChange("rochmann-user", "rochmann-user"), false);
});

test("does not refetch when there is no signed-in user", () => {
  assert.equal(shouldRefetchOrgsOnUserChange("rochmann-user", null), false);
  assert.equal(shouldRefetchOrgsOnUserChange("rochmann-user", undefined), false);
  assert.equal(shouldRefetchOrgsOnUserChange(null, null), false);
});
