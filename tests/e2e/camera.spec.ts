import { expect, test } from "@playwright/test";

test.use({
  launchOptions: {
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"]
  },
  permissions: ["camera"]
});

test("camera can start, capture a compressed snapshot, and stop", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "开启摄像头" }).click();
  await expect(page.getByLabel("Live camera preview")).toBeVisible();
  await expect(page.getByRole("button", { name: "截取当前画面" })).toBeEnabled();

  await page.getByRole("button", { name: "截取当前画面" }).click();
  await expect(page.getByText("Snapshot ready")).toBeVisible();
  await expect(page.getByText("Sent to AI observation")).toBeVisible();

  await page.getByRole("button", { name: "关闭摄像头" }).click();
  await expect(page.getByText("摄像头未开启")).toBeVisible();
});
