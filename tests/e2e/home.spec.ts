import { expect, test } from "@playwright/test";

test("home page shows the PR0 foundation regions", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Riff" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Camera workspace" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Conversation workspace" })).toBeVisible();
  await expect(page.getByRole("contentinfo", { name: "Status workspace" })).toBeVisible();
});
