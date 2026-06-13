import type { ChatRequest, ChatResponse } from "@/lib/contracts/chat";

export type ChatProviderName = "fake" | "openai";

export type ChatProvider = {
  name: ChatProviderName;
  complete(input: ChatRequest): Promise<ChatResponse>;
};

export function createVisionFallbackResponse(input: ChatRequest): ChatResponse {
  return {
    sessionId: input.sessionId,
    turnId: input.turnId,
    replyText:
      "I could not read the visual scene reliably, so I will stay with your words: shape this as a sparse, late-night idea with a restrained pulse and a lot of empty space.",
    visualObservation: {
      isUsable: false,
      summary: null,
      objects: [],
      sceneMood: null,
      motionEnergy: input.motionSignal?.energy ?? null,
      confidence: 0,
      failureReason: "vision_api_failed"
    },
    musicSuggestion: {
      mood: "late-night sparse",
      tempo: "70-85 BPM",
      instruments: ["soft pad", "sub bass"],
      structure: "quiet intro -> restrained pulse -> open ending",
      promptForMusicGen: "late-night sparse ambient, soft pad, sub bass, restrained pulse"
    },
    followUpQuestion: "Can you bring the object or workspace you want me to observe closer to the camera?",
    suggestedActions: []
  };
}
