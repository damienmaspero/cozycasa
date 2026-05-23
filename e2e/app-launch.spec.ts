import { expect, test } from "@playwright/test";

test("web app launches and renders the home screen", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("cozycasa")).toBeVisible();
});
