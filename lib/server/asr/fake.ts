import type { AsrProvider } from "./provider";

export function createFakeAsrProvider(): AsrProvider {
  return {
    name: "fake",
    async transcribe() {
      if (process.env.FAKE_ASR_SHOULD_FAIL === "true") {
        throw new Error("Fake ASR failure requested");
      }

      return {
        userText: process.env.FAKE_ASR_TEXT || "I want a lonely 3 AM streetlight feeling",
        provider: "fake"
      };
    }
  };
}
