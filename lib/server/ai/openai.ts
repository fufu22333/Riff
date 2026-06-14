import { chatResponseSchema, type ChatResponse } from "@/lib/contracts/chat";

import { buildRiffSystemPrompt, buildRiffUserPrompt } from "./prompts";
import type { ChatProvider } from "./provider";

const openAiChatResponseJsonSchema = {
  name: "riff_chat_response",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "sessionId",
      "turnId",
      "replyText",
      "visualObservation",
      "musicSuggestion",
      "followUpQuestion",
      "suggestedActions"
    ],
    properties: {
      sessionId: { type: "string" },
      turnId: { type: "string" },
      replyText: { type: "string" },
      visualObservation: {
        type: "object",
        additionalProperties: false,
        required: [
          "isUsable",
          "summary",
          "objects",
          "sceneMood",
          "motionEnergy",
          "confidence",
          "failureReason"
        ],
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
  const baseUrl =
    process.env.AI_API_BASE_URL?.replace(/\/$/, "") ||
    "https://api.openai.com/v1";

  return `${baseUrl}/chat/completions`;
}

function strictSystemPrompt() {
  return (
    buildRiffSystemPrompt() +
    `

Return ONLY valid JSON. Do not use markdown.

The JSON object MUST match this exact structure:
{
  "sessionId": "string",
  "turnId": "string",
  "replyText": "string",
  "visualObservation": {
    "isUsable": true,
    "summary": "string or null",
    "objects": ["string"],
    "sceneMood": "string or null",
    "motionEnergy": "low or medium or high or null",
    "confidence": 0.0,
    "failureReason": null
  },
  "musicSuggestion": {
    "mood": "string or null",
    "tempo": "string or null",
    "instruments": ["string"],
    "structure": "string or null",
    "promptForMusicGen": "string or null"
  },
  "followUpQuestion": "string or null",
  "suggestedActions": ["generate_music"]
}

Rules:
- visualObservation.objects must always be an array.
- visualObservation.confidence must always be a number from 0 to 1.
- visualObservation.motionEnergy must be "low", "medium", "high", or null.
- If visualObservation.isUsable is true, failureReason must be null.
- If visualObservation.isUsable is false, summary must be null and failureReason must be one of:
  "no_camera_permission", "snapshot_failed", "snapshot_blurry", "too_dark", "no_visual_subject", "vision_api_failed", "asr_failed", "tts_failed", "music_generation_failed".
- musicSuggestion.instruments must always be an array, never a string.
- musicSuggestion.promptForMusicGen is required.
- suggestedActions must be [] or ["generate_music"]. Do not put natural-language advice inside suggestedActions.
- Put natural-language advice inside replyText, musicSuggestion, or followUpQuestion only.`
  );
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

type CompatibleModelChatResponse = Partial<Omit<ChatResponse, "musicSuggestion" | "visualObservation" | "suggestedActions">> & {
  musicSuggestion?: Partial<Omit<ChatResponse["musicSuggestion"], "instruments">> & {
    instruments?: unknown;
  };
  visualObservation?: Partial<ChatResponse["visualObservation"]>;
  suggestedActions?: unknown[];
};

function normalizeChatResponse(raw: CompatibleModelChatResponse, input: Parameters<ChatProvider["complete"]>[0]) {
  const instruments = raw.musicSuggestion?.instruments;

  return chatResponseSchema.parse({
    ...raw,
    sessionId: input.sessionId,
    turnId: input.turnId,
    visualObservation: {
      isUsable: raw.visualObservation?.isUsable ?? false,
      summary: raw.visualObservation?.summary ?? null,
      objects: Array.isArray(raw.visualObservation?.objects)
        ? raw.visualObservation.objects
        : [],
      sceneMood: raw.visualObservation?.sceneMood ?? null,
      motionEnergy: raw.visualObservation?.motionEnergy ?? null,
      confidence:
        typeof raw.visualObservation?.confidence === "number"
          ? raw.visualObservation.confidence
          : raw.visualObservation?.isUsable
            ? 0.7
            : 0,
      failureReason:
        raw.visualObservation?.isUsable
          ? null
          : raw.visualObservation?.failureReason ?? "vision_api_failed"
    },
    musicSuggestion: {
      mood: raw.musicSuggestion?.mood ?? null,
      tempo: raw.musicSuggestion?.tempo ?? null,
      instruments: Array.isArray(instruments)
        ? instruments
        : typeof instruments === "string"
          ? instruments.split(",").map((item) => item.trim()).filter(Boolean)
          : [],
      structure: raw.musicSuggestion?.structure ?? null,
      promptForMusicGen:
        raw.musicSuggestion?.promptForMusicGen ??
        [
          raw.musicSuggestion?.mood,
          raw.musicSuggestion?.tempo,
          Array.isArray(instruments) ? instruments.join(", ") : instruments,
          raw.musicSuggestion?.structure
        ]
          .filter(Boolean)
          .join(", ")
    },
    followUpQuestion: raw.followUpQuestion ?? null,
    suggestedActions:
      Array.isArray(raw.suggestedActions) && raw.suggestedActions.includes("generate_music")
        ? ["generate_music"]
        : []
  });
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
            { role: "system", content: strictSystemPrompt() },
            { role: "user", content: createMessageContent(input) }
          ],
          response_format: {
            type: "json_schema",
            json_schema: openAiChatResponseJsonSchema
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `OpenAI chat failed with ${response.status}: ${errorText}`
        );
      }

      const body = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const content = body.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error(`OpenAI chat returned empty content: ${JSON.stringify(body)}`);
      }

      let parsed: CompatibleModelChatResponse;

      try {
        parsed = JSON.parse(content) as CompatibleModelChatResponse;
      } catch {
        throw new Error(`OpenAI chat returned non-JSON content: ${content}`);
      }

      return normalizeChatResponse(parsed, input);
    }
  };
}
