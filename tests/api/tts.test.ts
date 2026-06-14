// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/tts/route";
import { GET } from "@/app/api/tts/[jobId]/route";

async function postTts(overrides: Record<string, unknown> = {}) {
  return POST(
    new Request("http://localhost/api/tts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId: "session-1",
        turnId: "turn-1",
        replyText: "Try a slow dark ambient direction with soft noise.",
        ...overrides
      })
    })
  );
}

async function getTts(jobId: string) {
  return GET(new Request(`http://localhost/api/tts/${jobId}`), { params: { jobId } });
}

describe("TTS API", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("creates a pending fake TTS job and resolves it to a stored audio URL", async () => {
    vi.stubEnv("TTS_PROVIDER", "fake");
    vi.stubEnv("STORAGE_PROVIDER", "fake");

    const created = await postTts();
    const createdBody = await created.json();

    expect(created.status).toBe(202);
    expect(createdBody).toMatchObject({
      status: "pending",
      ttsJobId: expect.any(String),
      ttsUrl: null,
      errorCode: null
    });

    const polled = await getTts(createdBody.ttsJobId);
    const polledBody = await polled.json();

    expect(polled.status).toBe(200);
    expect(polledBody).toEqual({
      status: "ready",
      ttsJobId: createdBody.ttsJobId,
      ttsUrl: `https://cdn.example.com/audio/session-1/${createdBody.ttsJobId}.mp3`,
      errorCode: null
    });
  });

  it("returns browser fallback when server TTS is disabled", async () => {
    vi.stubEnv("TTS_PROVIDER", "browser");

    const response = await postTts();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: "fallback",
      ttsJobId: expect.any(String),
      ttsUrl: null,
      errorCode: null
    });
  });

  it("marks the job failed when provider synthesis fails", async () => {
    vi.stubEnv("TTS_PROVIDER", "fake");
    vi.stubEnv("STORAGE_PROVIDER", "fake");
    vi.stubEnv("FAKE_TTS_SHOULD_FAIL", "true");

    const created = await postTts();
    const createdBody = await created.json();
    const polled = await getTts(createdBody.ttsJobId);
    const polledBody = await polled.json();

    expect(polled.status).toBe(200);
    expect(polledBody).toEqual({
      status: "failed",
      ttsJobId: createdBody.ttsJobId,
      ttsUrl: null,
      errorCode: "tts_failed"
    });
  });

  it("marks the job failed when configured storage cannot initialize", async () => {
    vi.stubEnv("TTS_PROVIDER", "fake");
    vi.stubEnv("STORAGE_PROVIDER", "qiniu");
    vi.stubEnv("QINIU_ACCESS_KEY", "");
    vi.stubEnv("QINIU_SECRET_KEY", "");
    vi.stubEnv("QINIU_BUCKET", "");
    vi.stubEnv("QINIU_REGION", "");
    vi.stubEnv("QINIU_PUBLIC_DOMAIN", "");

    const created = await postTts();
    const createdBody = await created.json();
    const polled = await getTts(createdBody.ttsJobId);
    const polledBody = await polled.json();

    expect(polled.status).toBe(200);
    expect(polledBody).toEqual({
      status: "failed",
      ttsJobId: createdBody.ttsJobId,
      ttsUrl: null,
      errorCode: "tts_failed"
    });
  });

  it("rejects malformed TTS requests", async () => {
    vi.stubEnv("TTS_PROVIDER", "fake");

    const response = await postTts({ replyText: "" });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.errorCode).toBe("tts_failed");
  });
});
