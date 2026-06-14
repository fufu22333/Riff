import { expect, test } from "@playwright/test";

test("home page shows the main workspace regions", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Riff" })).toBeVisible();
  await expect(page.getByRole("region", { name: "摄像头区域" })).toBeVisible();
  await expect(page.getByText("摄像头未开启")).toBeVisible();
  await expect(page.getByRole("button", { name: "开启摄像头" })).toBeVisible();
  await expect(page.getByRole("button", { name: "截取当前画面" })).toBeDisabled();
  await expect(page.getByRole("region", { name: "对话区域" })).toBeVisible();
  await expect(page.getByRole("contentinfo", { name: "Status workspace" })).toBeVisible();
});
