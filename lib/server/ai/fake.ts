import type { ChatRequest, ChatResponse } from "@/lib/contracts/chat";

import type { ChatProvider } from "./provider";

function hasSnapshot(input: ChatRequest) {
  return Boolean(input.snapshot?.base64 || input.snapshotUrl);
}

export function createFakeChatProvider(): ChatProvider {
  return {
    name: "fake",
    async complete(input) {
      if (process.env.FAKE_CHAT_SHOULD_FAIL === "true") {
        throw new Error("Fake chat failure requested");
      }

      if (!hasSnapshot(input)) {
        return {
          sessionId: input.sessionId,
          turnId: input.turnId,
          replyText:
            "The visual signal is unavailable, so I will not invent a scene. From your words, aim for a lonely late-night cue with a slow pulse and a soft harmonic bed.",
          visualObservation: {
            isUsable: false,
            summary: null,
            objects: [],
            sceneMood: null,
            motionEnergy: input.motionSignal?.energy ?? null,
            confidence: 0.15,
            failureReason: "no_visual_subject"
          },
          musicSuggestion: {
            mood: "lonely late-night",
            tempo: "72-84 BPM",
            instruments: ["felt piano", "soft noise"],
            structure: "single motif -> airy pad lift -> sparse beat",
            promptForMusicGen: "lonely late-night, felt piano, soft noise, sparse beat"
          },
          followUpQuestion: "Do you want to show the desk, instrument, or lyric sheet for a more visual direction?",
          suggestedActions: ["generate_music"]
        };
      }

      return {
        sessionId: input.sessionId,
        turnId: input.turnId,
        replyText: `The snapshot gives me a visual anchor while your phrase points at a lonely 3 AM streetlight feeling. I would keep the arrangement dim, spacious, and slow, with the rhythm arriving like distant footsteps.`,
        visualObservation: {
          isUsable: true,
          summary: "A usable compressed snapshot is available for this turn, giving the AI a current visual anchor.",
          objects: ["snapshot"],
          sceneMood: "quiet / focused",
          motionEnergy: input.motionSignal?.energy ?? "low",
          confidence: 0.72,
          failureReason: null
        },
        musicSuggestion: {
          mood: "lonely 3 AM streetlight",
          tempo: "70-85 BPM",
          instruments: ["warm pad", "sub bass", "brushed percussion"],
          structure: "ambient intro -> sparse pulse -> unresolved outro",
          promptForMusicGen: "lonely 3 AM streetlight, warm pad, sub bass, brushed percussion, sparse pulse"
        },
        followUpQuestion: "Should the next version lean more cinematic or more beat-driven?",
        suggestedActions: ["generate_music"]
      };
    }
  };
}
