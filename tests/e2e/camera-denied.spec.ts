import { expect, test } from "@playwright/test";

test.use({
  launchOptions: {
    args: ["--use-fake-device-for-media-stream", "--deny-permission-prompts"]
  }
});

test("camera denial shows the voice-only fallback state", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "开启摄像头" }).click();
  await expect(page.getByText("no_camera_permission")).toBeVisible();
  await expect(page.getByText("可以继续纯语音模式")).toBeVisible();
  await expect(page.getByRole("button", { name: "截取当前画面" })).toBeDisabled();
});
