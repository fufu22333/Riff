import { describe, expect, it } from "vitest";

import {
  chatRequestSchema,
  chatResponseSchema,
  musicSuggestionSchema,
  visualObservationSchema
} from "@/lib/contracts/chat";
import { failureCodes, isFailureCode } from "@/lib/contracts/failures";

describe("failure contracts", () => {
  it("exposes the visual and workflow failure codes used by the PRD", () => {
    expect(failureCodes).toEqual([
      "no_camera_permission",
      "snapshot_failed",
      "snapshot_blurry",
      "too_dark",
      "no_visual_subject",
      "vision_api_failed",
      "asr_failed",
      "tts_failed",
      "music_generation_failed"
    ]);
    expect(isFailureCode("too_dark")).toBe(true);
    expect(isFailureCode("made_up_failure")).toBe(false);
  });
});

describe("chat contracts", () => {
  it("accepts the PRD chat request shape", () => {
    const parsed = chatRequestSchema.parse({
      sessionId: "session-1",
      turnId: "turn-1",
      userText: "我想要凌晨三点孤独路灯的感觉",
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

    expect(parsed.snapshot?.width).toBe(768);
    expect(parsed.motionSignal?.energy).toBe("low");
  });

  it("requires a failure reason when visual observation is unusable", () => {
    expect(() =>
      visualObservationSchema.parse({
        isUsable: false,
        summary: null,
        objects: [],
        sceneMood: null,
        motionEnergy: null,
        confidence: 0.2,
        failureReason: null
      })
    ).toThrow(/failureReason/);
  });

  it("accepts music suggestions when at least two core fields are present", () => {
    const parsed = musicSuggestionSchema.parse({
      mood: "dark ambient",
      tempo: "70-85 BPM",
      instruments: [],
      structure: null,
      promptForMusicGen: null
    });

    expect(parsed.mood).toBe("dark ambient");
  });

  it("accepts the PRD chat response shape", () => {
    const parsed = chatResponseSchema.parse({
      sessionId: "session-1",
      turnId: "turn-1",
      replyText: "我能看到耳机和偏暗的房间，适合做低速氛围铺底。",
      visualObservation: {
        isUsable: true,
        summary: "用户戴着耳机，房间偏暗",
        objects: ["耳机"],
        sceneMood: "低光 / 安静",
        motionEnergy: "low",
        confidence: 0.78,
        failureReason: null
      },
      musicSuggestion: {
        mood: "黑暗氛围",
        tempo: "70-85 BPM",
        instruments: ["pad", "sub bass"],
        structure: "intro -> sparse beat",
        promptForMusicGen: "dark ambient, slow tempo, wide pads"
      },
      followUpQuestion: "要继续往更空旷的方向走吗？",
      suggestedActions: ["generate_music"],
      qiniu: {
        snapshotUrl: null,
        turnJsonUrl: null
      },
      tts: {
        status: "pending",
        ttsJobId: "job-1"
      }
    });

    expect(parsed.visualObservation.failureReason).toBeNull();
  });
});
