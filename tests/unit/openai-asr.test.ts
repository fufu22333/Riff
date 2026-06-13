import { afterEach, describe, expect, it, vi } from "vitest";

import { createOpenAiAsrProvider } from "@/lib/server/asr/openai";

describe("OpenAI ASR provider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("sends audio to OpenAI with the configured transcription model", async () => {
    vi.stubEnv("ASR_API_KEY", "test-key");
    vi.stubEnv("ASR_MODEL", "whisper-1");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ text: "Make the chorus bloom after the break" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    const result = await createOpenAiAsrProvider().transcribe({
      audio: new Blob(["voice"], { type: "audio/webm" }),
      filename: "turn.webm"
    });

    expect(result).toEqual({
      userText: "Make the chorus bloom after the break",
      provider: "openai"
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/audio/transcriptions",
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer test-key" },
        body: expect.any(FormData)
      })
    );
    const body = fetchMock.mock.calls[0][1]?.body as FormData;
    expect(body.get("model")).toBe("whisper-1");
    expect(body.get("file")).toBeInstanceOf(Blob);
  });

  it("rejects empty transcription text", async () => {
    vi.stubEnv("ASR_API_KEY", "test-key");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ text: "   " }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    await expect(
      createOpenAiAsrProvider().transcribe({
        audio: new Blob(["voice"], { type: "audio/webm" }),
        filename: "turn.webm"
      })
    ).rejects.toThrow("OpenAI ASR returned empty text");
  });
});
