import { expect, test } from "@playwright/test";

test("homepage loads", async ({ page }) => {
  const response = await page.goto("/");
  expect(response, "navigation response should exist").not.toBeNull();
  expect(response!.status(), "homepage should return HTTP 200").toBe(200);

  // Minimal, UI-agnostic assertion: the document has a non-empty <title>.
  // Keeps the smoke test robust against app-level changes.
  await expect(page).toHaveTitle(/.+/);
});
