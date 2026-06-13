// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/asr/route";

function createAudioForm() {
  const formData = new FormData();
  formData.set("audio", new Blob(["riff audio"], { type: "audio/webm" }), "turn.webm");
  return formData;
}

describe("POST /api/asr", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns userText with the fake provider", async () => {
    vi.stubEnv("ASR_PROVIDER", "fake");
    vi.stubEnv("FAKE_ASR_TEXT", "I want a lonely 3 AM streetlight feeling");

    const response = await POST(new Request("http://localhost/api/asr", { method: "POST", body: createAudioForm() }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      userText: "I want a lonely 3 AM streetlight feeling",
      provider: "fake"
    });
  });

  it("returns asr_failed when audio is missing", async () => {
    vi.stubEnv("ASR_PROVIDER", "fake");

    const response = await POST(new Request("http://localhost/api/asr", { method: "POST", body: new FormData() }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.failureReason).toBe("asr_failed");
  });

  it("returns asr_failed when the provider throws", async () => {
    vi.stubEnv("ASR_PROVIDER", "fake");
    vi.stubEnv("FAKE_ASR_SHOULD_FAIL", "true");

    const response = await POST(new Request("http://localhost/api/asr", { method: "POST", body: createAudioForm() }));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.failureReason).toBe("asr_failed");
  });
});
