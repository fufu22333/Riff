import { describe, expect, it } from "vitest";

import { chatResponseSchema } from "@/lib/contracts/chat";
import { createFakeChatProvider } from "@/lib/server/ai/fake";
import { buildRiffSystemPrompt } from "@/lib/server/ai/prompts";

describe("chat provider", () => {
  it("fake provider returns a schema-valid visual and music response", async () => {
    const provider = createFakeChatProvider();

    const response = await provider.complete({
      sessionId: "session-1",
      turnId: "turn-1",
      userText: "Make it feel like dim headphones and a sparse beat",
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

    expect(() => chatResponseSchema.parse(response)).not.toThrow();
    expect(response.visualObservation.summary).toContain("snapshot");
    expect(response.musicSuggestion.instruments.length).toBeGreaterThan(0);
  });

  it("prompt requires visual evidence or an explicit failure reason", () => {
    const prompt = buildRiffSystemPrompt();

    expect(prompt).toContain("visualObservation");
    expect(prompt).toContain("failureReason");
    expect(prompt).toContain("Do not invent visual details");
    expect(prompt).toContain("musicSuggestion");
  });
});
