import { expect, test } from "@playwright/test";

test.use({
  launchOptions: {
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"]
  },
  permissions: ["camera"]
});

test("camera can start, capture a compressed snapshot, and stop", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Start camera" }).click();
  await expect(page.getByLabel("Live camera preview")).toBeVisible();
  await expect(page.getByRole("button", { name: "Capture snapshot" })).toBeEnabled();

  await page.getByRole("button", { name: "Capture snapshot" }).click();
  await expect(page.getByText("Snapshot ready")).toBeVisible();
  await expect(page.getByText("Sent to AI observation")).toBeVisible();

  await page.getByRole("button", { name: "Stop camera" }).click();
  await expect(page.getByText("Camera is off")).toBeVisible();
});
