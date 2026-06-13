import { expect, test } from "@playwright/test";

test.use({
  launchOptions: {
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"]
  },
  permissions: ["microphone"]
});

test("fake ASR returns userText and updates the conversation shell", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Test ASR" }).click();

  await expect(page.getByText("userText")).toBeVisible();
  await expect(page.getByText("I want a lonely 3 AM streetlight feeling")).toHaveCount(2);
  await expect(page.getByText("Visual fallback")).toBeVisible();
  await expect(page.getByText("Cloud evidence")).toBeVisible();
  await expect(page.getByRole("link").filter({ hasText: "/turns/" })).toBeVisible();
});

test("records from the browser microphone APIs and submits the clip to ASR", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Start voice" }).click();
  await expect(page.getByText("Listening")).toBeVisible();
  await expect(page.getByText("ASR state: recording")).toBeVisible();

  await page.getByRole("button", { name: "Stop voice" }).click();

  await expect(page.getByText("userText")).toBeVisible();
  await expect(page.getByText("I want a lonely 3 AM streetlight feeling")).toHaveCount(2);
});
