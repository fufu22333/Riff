import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry"
  },
  webServer: {
    command: "node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3100",
    env: {
      AI_PROVIDER: "fake",
      ASR_PROVIDER: "fake",
      STORAGE_PROVIDER: "fake",
      MUSIC_PROVIDER: "fake"
    },
    url: "http://localhost:3100",
    reuseExistingServer: true,
    timeout: 120_000
  },
  projects: [
    {
      name: "msedge",
      use: { ...devices["Desktop Edge"], channel: "msedge" }
    }
  ]
});
