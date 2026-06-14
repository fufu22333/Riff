import { expect, test } from "@playwright/test";

test.use({
  launchOptions: {
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"]
  },
  permissions: ["microphone"]
});

test("fake ASR returns userText and updates the conversation shell", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "测试识别" }).click();

  await expect(page.getByText("userText")).toBeVisible();
  await expect(page.getByText("I want a lonely 3 AM streetlight feeling")).toHaveCount(2);
  await expect(page.getByText("视觉不可用")).toBeVisible();
  await expect(page.getByText("云端记录")).toBeVisible();
  await expect(page.getByRole("link").filter({ hasText: "/turns/" })).toBeVisible();
});

test("records from the browser microphone APIs and submits the clip to ASR", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "开始说话" }).click();
  await expect(page.getByText("Listening")).toBeVisible();
  await expect(page.getByText("ASR state: recording")).toBeVisible();

  await page.getByRole("button", { name: "停止" }).click();

  await expect(page.getByText("userText")).toBeVisible();
  await expect(page.getByText("I want a lonely 3 AM streetlight feeling")).toHaveCount(2);
});
