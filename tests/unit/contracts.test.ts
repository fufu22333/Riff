import { describe, expect, it } from "vitest";

import {
  chatRequestSchema,
  chatResponseSchema,
  musicSuggestionSchema,
  visualObservationSchema
} from "@/lib/contracts/chat";
import { failureCodes, isFailureCode } from "@/lib/contracts/failures";
import { generateCreateRequestSchema, generateJobResponseSchema } from "@/lib/contracts/generate";

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

  it("accepts a stored snapshot URL when base64 snapshot is not available", () => {
    const parsed = chatRequestSchema.parse({
      sessionId: "session-1",
      turnId: "turn-1",
      userText: "Use the saved desk snapshot for this turn",
      snapshotUrl: "https://cdn.example.com/snapshots/session-1/turn-1.webp"
    });

    expect(parsed.snapshotUrl).toBe("https://cdn.example.com/snapshots/session-1/turn-1.webp");
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

  it("rejects unsupported TTS status values", () => {
    expect(() =>
      chatResponseSchema.parse({
        sessionId: "session-1",
        turnId: "turn-1",
        replyText: "Here is a grounded direction.",
        visualObservation: {
          isUsable: true,
          summary: "A usable snapshot is present",
          objects: ["snapshot"],
          sceneMood: "focused",
          motionEnergy: "low",
          confidence: 0.8,
          failureReason: null
        },
        musicSuggestion: {
          mood: "quiet",
          tempo: "78 BPM",
          instruments: [],
          structure: null,
          promptForMusicGen: null
        },
        followUpQuestion: null,
        suggestedActions: [],
        tts: {
          status: "queued"
        }
      })
    ).toThrow();
  });
});

describe("music generation contracts", () => {
  it("accepts the PR8 generation request shape", () => {
    const parsed = generateCreateRequestSchema.parse({
      sessionId: "session-1",
      turnId: "turn-1",
      promptForMusicGen: "midnight rain sparse felt piano"
    });

    expect(parsed.promptForMusicGen).toBe("midnight rain sparse felt piano");
  });

  it("accepts async generation job states and playable fallback samples", () => {
    expect(
      generateJobResponseSchema.parse({
        status: "queued",
        jobId: "music-job-1",
        musicUrl: null,
        errorCode: null,
        usage: "reference_only",
        isExportable: false
      }).status
    ).toBe("queued");

    expect(
      generateJobResponseSchema.parse({
        status: "fallback_ready",
        jobId: "music-job-2",
        musicUrl: "https://cdn.example.com/audio/session-1/music-job-2.mp3",
        errorCode: "music_generation_failed",
        usage: "reference_only",
        isExportable: false
      }).musicUrl
    ).toContain("music-job-2.mp3");
  });

  it("requires ready generation jobs to include a music URL", () => {
    expect(() =>
      generateJobResponseSchema.parse({
        status: "ready",
        jobId: "music-job-3",
        musicUrl: null,
        errorCode: null,
        usage: "reference_only",
        isExportable: false
      })
    ).toThrow(/musicUrl/);
  });

  it("requires fallback-ready generation jobs to include the playable reference URL", () => {
    expect(() =>
      generateJobResponseSchema.parse({
        status: "fallback_ready",
        jobId: "music-job-4",
        musicUrl: null,
        errorCode: "music_generation_failed",
        usage: "reference_only",
        isExportable: false
      })
    ).toThrow(/musicUrl/);
  });

  it("requires generation responses to stay reference-only and non-exportable", () => {
    const parsed = generateJobResponseSchema.parse({
      status: "ready",
      jobId: "music-job-5",
      musicUrl: "https://cdn.example.com/audio/session-1/music-job-5.mp3",
      errorCode: null,
      usage: "reference_only",
      isExportable: false
    });

    expect(parsed.usage).toBe("reference_only");
    expect(parsed.isExportable).toBe(false);
  });

  it("rejects export-oriented fields on generation responses", () => {
    expect(() =>
      generateJobResponseSchema.parse({
        status: "ready",
        jobId: "music-job-6",
        musicUrl: "https://cdn.example.com/audio/session-1/music-job-6.mp3",
        downloadUrl: "https://cdn.example.com/audio/session-1/music-job-6.mp3?download=1",
        errorCode: null,
        usage: "reference_only",
        isExportable: false
      })
    ).toThrow(/downloadUrl/);

    expect(() =>
      generateJobResponseSchema.parse({
        status: "fallback",
        jobId: "music-job-7",
        musicUrl: "https://cdn.example.com/audio/session-1/music-job-7.mp3",
        errorCode: "music_generation_failed",
        usage: "reference_only",
        isExportable: false
      })
    ).toThrow();
  });
});
