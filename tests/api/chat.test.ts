// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/chat/route";

function createChatRequest(overrides: Record<string, unknown> = {}) {
  return {
    sessionId: "session-1",
    turnId: "turn-1",
    userText: "I want a lonely 3 AM streetlight feeling",
    snapshot: {
      mimeType: "image/webp",
      base64: "abc123",
      width: 768,
      height: 432
    },
    motionSignal: {
      energy: "low",
      rhythmic: false,
      approach: "stable"
    },
    historySummary: "",
    ...overrides
  };
}

async function postChat(body: unknown) {
  return POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    })
  );
}

describe("POST /api/chat", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns structured multimodal guidance with the fake provider", async () => {
    vi.stubEnv("AI_PROVIDER", "fake");

    const response = await postChat(createChatRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      sessionId: "session-1",
      turnId: "turn-1",
      visualObservation: {
        isUsable: true,
        failureReason: null
      },
      musicSuggestion: {
        mood: expect.any(String),
        tempo: expect.any(String)
      }
    });
    expect(body.replyText).toContain("lonely 3 AM streetlight");
    expect(body.visualObservation.summary).toContain("snapshot");
  });

  it("marks vision as unavailable when no snapshot is provided", async () => {
    vi.stubEnv("AI_PROVIDER", "fake");

    const response = await postChat(createChatRequest({ snapshot: null }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.visualObservation).toMatchObject({
      isUsable: false,
      summary: null,
      failureReason: "no_visual_subject"
    });
    expect(body.replyText).not.toContain("I can see");
  });

  it("returns a safe fallback response when the provider throws", async () => {
    vi.stubEnv("AI_PROVIDER", "fake");
    vi.stubEnv("FAKE_CHAT_SHOULD_FAIL", "true");

    const response = await postChat(createChatRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.visualObservation).toMatchObject({
      isUsable: false,
      failureReason: "vision_api_failed"
    });
    expect(body.musicSuggestion.instruments.length).toBeGreaterThan(0);
  });

  it("rejects malformed chat requests", async () => {
    vi.stubEnv("AI_PROVIDER", "fake");

    const response = await postChat(createChatRequest({ userText: "" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.failureReason).toBe("vision_api_failed");
  });
});
