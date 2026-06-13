import { chatResponseSchema, type ChatResponse } from "@/lib/contracts/chat";

import { buildRiffSystemPrompt, buildRiffUserPrompt } from "./prompts";
import type { ChatProvider } from "./provider";

const openAiChatResponseJsonSchema = {
  name: "riff_chat_response",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["sessionId", "turnId", "replyText", "visualObservation", "musicSuggestion", "followUpQuestion", "suggestedActions"],
    properties: {
      sessionId: { type: "string" },
      turnId: { type: "string" },
      replyText: { type: "string" },
      visualObservation: {
        type: "object",
        additionalProperties: false,
        required: ["isUsable", "summary", "objects", "sceneMood", "motionEnergy", "confidence", "failureReason"],
        properties: {
          isUsable: { type: "boolean" },
          summary: { type: ["string", "null"] },
          objects: { type: "array", items: { type: "string" } },
          sceneMood: { type: ["string", "null"] },
          motionEnergy: { enum: ["low", "medium", "high", null] },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          failureReason: {
            enum: [
              "no_camera_permission",
              "snapshot_failed",
              "snapshot_blurry",
              "too_dark",
              "no_visual_subject",
              "vision_api_failed",
              "asr_failed",
              "tts_failed",
              "music_generation_failed",
              null
            ]
          }
        }
      },
      musicSuggestion: {
        type: "object",
        additionalProperties: false,
        required: ["mood", "tempo", "instruments", "structure", "promptForMusicGen"],
        properties: {
          mood: { type: ["string", "null"] },
          tempo: { type: ["string", "null"] },
          instruments: { type: "array", items: { type: "string" } },
          structure: { type: ["string", "null"] },
          promptForMusicGen: { type: ["string", "null"] }
        }
      },
      followUpQuestion: { type: ["string", "null"] },
      suggestedActions: {
        type: "array",
        items: { enum: ["generate_music"] }
      }
    }
  }
};

function chatCompletionsUrl() {
  const baseUrl = process.env.AI_API_BASE_URL?.replace(/\/$/, "") || "https://api.openai.com/v1";

  return `${baseUrl}/chat/completions`;
}

function createMessageContent(input: Parameters<ChatProvider["complete"]>[0]) {
  const textContent = {
    type: "text",
    text: buildRiffUserPrompt(input.userText, input.historySummary)
  };

  const imageUrl = input.snapshot
    ? `data:${input.snapshot.mimeType};base64,${input.snapshot.base64}`
    : input.snapshotUrl;

  if (!imageUrl) {
    return [textContent];
  }

  return [
    textContent,
    {
      type: "image_url",
      image_url: {
        url: imageUrl,
        detail: "low"
      }
    }
  ];
}

export function createOpenAiChatProvider(): ChatProvider {
  return {
    name: "openai",
    async complete(input) {
      const apiKey = process.env.AI_API_KEY;

      if (!apiKey) {
        throw new Error("AI_API_KEY is required for OpenAI chat");
      }

      const model = process.env.AI_MODEL_MULTIMODAL;
      if (!model) {
        throw new Error("AI_MODEL_MULTIMODAL is required for OpenAI-compatible chat");
      }

      const response = await fetch(chatCompletionsUrl(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: buildRiffSystemPrompt() },
            { role: "user", content: createMessageContent(input) }
          ],
          response_format: {
            type: "json_schema",
            json_schema: openAiChatResponseJsonSchema
          }
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI chat failed with ${response.status}`);
      }

      const body = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = body.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("OpenAI chat returned empty content");
      }

      const parsed = JSON.parse(content) as ChatResponse;
      return chatResponseSchema.parse({
        ...parsed,
        sessionId: input.sessionId,
        turnId: input.turnId
      });
    }
  };
}
