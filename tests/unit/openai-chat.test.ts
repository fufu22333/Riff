import { afterEach, describe, expect, it, vi } from "vitest";

import { createOpenAiChatProvider } from "@/lib/server/ai/openai";

describe("OpenAI chat provider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("sends text and image content to OpenAI with structured JSON output", async () => {
    vi.stubEnv("AI_API_KEY", "test-key");
    vi.stubEnv("AI_MODEL_MULTIMODAL", "qwen-vl-plus");
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
    expect(body.model).toBe("qwen-vl-plus");
    expect(body.response_format.type).toBe("json_schema");
    expect(body.messages[1].content[1].image_url.url).toBe("data:image/webp;base64,abc123");
  });

  it("uses an OpenAI-compatible base URL when configured", async () => {
    vi.stubEnv("AI_API_KEY", "dashscope-key");
    vi.stubEnv("AI_API_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1");
    vi.stubEnv("AI_MODEL_MULTIMODAL", "qwen-vl-plus");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  sessionId: "session-1",
                  turnId: "turn-1",
                  replyText: "Use the visible desk mood as the arrangement anchor.",
                  visualObservation: {
                    isUsable: true,
                    summary: "A desk snapshot is visible",
                    objects: ["desk"],
                    sceneMood: "focused",
                    motionEnergy: "low",
                    confidence: 0.82,
                    failureReason: null
                  },
                  musicSuggestion: {
                    mood: "focused",
                    tempo: "84 BPM",
                    instruments: ["muted keys"],
                    structure: "motif -> groove",
                    promptForMusicGen: "focused muted keys"
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

    await createOpenAiChatProvider().complete({
      sessionId: "session-1",
      turnId: "turn-1",
      userText: "Use the desk mood",
      snapshot: null,
      motionSignal: null,
      historySummary: ""
    });

    expect(fetchMock.mock.calls[0][0]).toBe("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions");
    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(body.model).toBe("qwen-vl-plus");
  });

  it("normalizes compatible model output into the Riff chat contract", async () => {
    vi.stubEnv("AI_API_KEY", "test-key");
    vi.stubEnv("AI_MODEL_MULTIMODAL", "qwen-vl-plus");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  sessionId: "model-session",
                  turnId: "model-turn",
                  replyText: "The scene suggests a restrained pulse with glassy keys.",
                  visualObservation: {
                    isUsable: true,
                    summary: "A dim desk setup is visible",
                    objects: ["desk"],
                    sceneMood: "dim and focused"
                  },
                  musicSuggestion: {
                    mood: "restrained",
                    tempo: "82 BPM",
                    instruments: "glassy keys, sub bass"
                  },
                  suggestedActions: ["generate_music", "try softer drums"]
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
      userText: "Make this feel restrained",
      snapshot: null,
      motionSignal: null,
      historySummary: ""
    });

    expect(result.sessionId).toBe("session-1");
    expect(result.turnId).toBe("turn-1");
    expect(result.visualObservation.confidence).toBe(0.7);
    expect(result.visualObservation.failureReason).toBeNull();
    expect(result.musicSuggestion.instruments).toEqual(["glassy keys", "sub bass"]);
    expect(result.musicSuggestion.promptForMusicGen).toBe("restrained, 82 BPM, glassy keys, sub bass");
    expect(result.suggestedActions).toEqual(["generate_music"]);
  });

  it("rejects schema-invalid model output", async () => {
    vi.stubEnv("AI_API_KEY", "test-key");
    vi.stubEnv("AI_MODEL_MULTIMODAL", "qwen-vl-plus");
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

  it("includes provider response text when the compatible chat endpoint fails", async () => {
    vi.stubEnv("AI_API_KEY", "test-key");
    vi.stubEnv("AI_MODEL_MULTIMODAL", "qwen-vl-plus");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "model unavailable" } }), {
        status: 404,
        headers: { "content-type": "application/json" }
      })
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
    ).rejects.toThrow("model unavailable");
  });

  it("reports non-JSON compatible chat content before schema validation", async () => {
    vi.stubEnv("AI_API_KEY", "test-key");
    vi.stubEnv("AI_MODEL_MULTIMODAL", "qwen-vl-plus");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "not json" } }]
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
    ).rejects.toThrow("non-JSON content");
  });

  it("requires an explicitly configured multimodal model", async () => {
    vi.stubEnv("AI_API_KEY", "test-key");

    await expect(
      createOpenAiChatProvider().complete({
        sessionId: "session-1",
        turnId: "turn-1",
        userText: "Make it sparse",
        snapshot: null,
        motionSignal: null,
        historySummary: ""
      })
    ).rejects.toThrow("AI_MODEL_MULTIMODAL is required");
  });
});
