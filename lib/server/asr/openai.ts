import type { AsrProvider } from "./provider";

function audioTranscriptionsUrl() {
  const baseUrl =
    process.env.ASR_API_BASE_URL?.replace(/\/$/, "") ||
    "https://api.openai.com/v1";

  return `${baseUrl}/audio/transcriptions`;
}

export function createOpenAiAsrProvider(): AsrProvider {
  return {
    name: "openai",
    async transcribe({ audio, filename }) {
      const apiKey = process.env.ASR_API_KEY || process.env.AI_API_KEY;

      if (!apiKey) {
        throw new Error("ASR_API_KEY is required for OpenAI ASR");
      }

      const formData = new FormData();
      formData.set("file", audio, filename);
      formData.set("model", process.env.ASR_MODEL || "gpt-4o-mini-transcribe");

      const response = await fetch(audioTranscriptionsUrl(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI ASR failed with ${response.status}: ${errorText}`);
      }

      const body = (await response.json()) as { text?: string };
      const userText = body.text?.trim();

      if (!userText) {
        throw new Error("OpenAI ASR returned empty text");
      }

      return {
        userText,
        provider: "openai"
      };
    }
  };
}
