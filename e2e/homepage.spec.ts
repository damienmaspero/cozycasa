import { expect, test } from "@playwright/test";

test("homepage loads", async ({ page }) => {
  const response = await page.goto("/");
  expect(response, "navigation response should exist").not.toBeNull();
  expect(response!.status(), "homepage should return HTTP 200").toBe(200);

  // Minimal, UI-agnostic assertion: app root is rendered.
  // This avoids relying on framework-managed <title> behavior.
  await expect(page.locator("#root")).toBeVisible();
});
