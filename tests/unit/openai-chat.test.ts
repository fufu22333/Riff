import { afterEach, describe, expect, it, vi } from "vitest";

import { createOpenAiChatProvider } from "@/lib/server/ai/openai";

describe("OpenAI chat provider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("sends text and image content to OpenAI with structured JSON output", async () => {
    vi.stubEnv("AI_API_KEY", "test-key");
    vi.stubEnv("AI_MODEL_MULTIMODAL", "gpt-4o-mini");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  sessionId: "model-session",
                  turnId: "model-turn",
                  replyText: "The snapshot and words point toward a sparse late-night cue.",
                  visualObservation: {
                    isUsable: true,
                    summary: "A desk snapshot is visible",
                    objects: ["desk"],
                    sceneMood: "low light",
                    motionEnergy: "low",
                    confidence: 0.82,
                    failureReason: null
                  },
                  musicSuggestion: {
                    mood: "late-night",
                    tempo: "76 BPM",
                    instruments: ["pad"],
                    structure: null,
                    promptForMusicGen: "late-night pad"
                  },
                  followUpQuestion: null,
                  suggestedActions: ["generate_music"]
                })
              }
            }
          ]
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" }
        }
      )
    );

    const result = await createOpenAiChatProvider().complete({
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
      historySummary: ""
    });

    expect(result.sessionId).toBe("session-1");
    expect(result.turnId).toBe("turn-1");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
          "Content-Type": "application/json"
        })
      })
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(body.model).toBe("gpt-4o-mini");
    expect(body.response_format.type).toBe("json_schema");
    expect(body.messages[1].content[1].image_url.url).toBe("data:image/webp;base64,abc123");
  });

  it("rejects schema-invalid model output", async () => {
    vi.stubEnv("AI_API_KEY", "test-key");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  sessionId: "session-1",
                  turnId: "turn-1",
                  replyText: "Missing required structure"
                })
              }
            }
          ]
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" }
        }
      )
    );

    await expect(
      createOpenAiChatProvider().complete({
        sessionId: "session-1",
        turnId: "turn-1",
        userText: "Make it sparse",
        snapshot: null,
        motionSignal: null,
        historySummary: ""
      })
    ).rejects.toThrow();
  });
});
