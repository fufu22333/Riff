import { expect, test } from "@playwright/test";

test.use({
  launchOptions: {
    args: ["--use-fake-device-for-media-stream", "--deny-permission-prompts"]
  }
});

test("camera denial shows the voice-only fallback state", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Start camera" }).click();
  await expect(page.getByText("no_camera_permission")).toBeVisible();
  await expect(page.getByText("continuing in voice-only mode")).toBeVisible();
  await expect(page.getByRole("button", { name: "Capture snapshot" })).toBeDisabled();
});
