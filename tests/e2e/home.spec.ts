import { expect, test } from "@playwright/test";

test("home page shows the main workspace regions", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Riff" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Camera workspace" })).toBeVisible();
  await expect(page.getByText("Camera is off")).toBeVisible();
  await expect(page.getByRole("button", { name: "Start camera" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Capture snapshot" })).toBeDisabled();
  await expect(page.getByRole("region", { name: "Conversation workspace" })).toBeVisible();
  await expect(page.getByRole("contentinfo", { name: "Status workspace" })).toBeVisible();
});
