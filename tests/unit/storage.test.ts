import { afterEach, describe, expect, it, vi } from "vitest";

import { createFakeTurnStorage, getStorageKeys, persistCompletedTurn } from "@/lib/server/storage/provider";
import type { CompletedTurnStorageInput } from "@/lib/server/storage/provider";

function createStorageInput(overrides: Partial<CompletedTurnStorageInput> = {}): CompletedTurnStorageInput {
  const submittedSnapshotBase64 = Buffer.from("fresh-frame").toString("base64");

  return {
    request: {
      sessionId: "session-1",
      turnId: "turn-1",
      userText: "Make it feel like midnight rain",
      snapshot: {
        mimeType: "image/webp",
        base64: submittedSnapshotBase64,
        width: 640,
        height: 360
      },
      motionSignal: null,
      historySummary: ""
    },
    response: {
      sessionId: "session-1",
      turnId: "turn-1",
      replyText: "Use a sparse midnight rain cue.",
      visualObservation: {
        isUsable: true,
        summary: "A current snapshot is available.",
        objects: ["desk"],
        sceneMood: "focused",
        motionEnergy: "low",
        confidence: 0.78,
        failureReason: null
      },
      musicSuggestion: {
        mood: "midnight rain",
        tempo: "74 BPM",
        instruments: ["felt piano", "soft pad"],
        structure: "quiet intro -> pulse",
        promptForMusicGen: "midnight rain sparse felt piano"
      },
      followUpQuestion: null,
      suggestedActions: ["generate_music"]
    },
    ...overrides
  };
}

describe("turn storage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("persists a completed turn with the submitted snapshot and merges it into session JSON", async () => {
    const storage = createFakeTurnStorage("https://cdn.example.com");

    const result = await persistCompletedTurn(storage, createStorageInput());

    expect(result).toEqual({
      snapshotUrl: "https://cdn.example.com/snapshots/session-1/turn-1.webp",
      turnJsonUrl: "https://cdn.example.com/turns/session-1/turn-1.json"
    });
    expect(storage.readJson?.("snapshots/session-1/turn-1.webp")).toBe(Buffer.from("fresh-frame").toString("base64"));
    expect(storage.readJson?.("turns/session-1/turn-1.json")).toMatchObject({
      request: {
        sessionId: "session-1",
        turnId: "turn-1",
        userText: "Make it feel like midnight rain"
      },
      response: {
        qiniu: result
      }
    });
    expect(storage.readJson?.("sessions/session-1.json")).toMatchObject({
      sessionId: "session-1",
      turns: [
        {
          turnId: "turn-1",
          snapshotUrl: result.snapshotUrl,
          turnJsonUrl: result.turnJsonUrl
        }
      ]
    });
  });

  it("keeps the documented storage key layout for snapshots, turns, sessions, and audio", () => {
    expect(getStorageKeys("session-1", "turn-1", "asset-1")).toEqual({
      snapshot: "snapshots/session-1/turn-1.webp",
      turnJson: "turns/session-1/turn-1.json",
      sessionJson: "sessions/session-1.json",
      audio: "audio/session-1/asset-1.mp3"
    });
  });

  it("does not upload a snapshot when the submitted turn has no snapshot", async () => {
    const storage = createFakeTurnStorage("https://cdn.example.com");

    const result = await persistCompletedTurn(
      storage,
      createStorageInput({
        request: {
          ...createStorageInput().request,
          snapshot: null
        }
      })
    );

    expect(result.snapshotUrl).toBeNull();
    expect(storage.readJson?.("snapshots/session-1/turn-1.webp")).toBeUndefined();
  });

  it("keeps earlier completed turns when merging a later turn into session JSON", async () => {
    const storage = createFakeTurnStorage("https://cdn.example.com");

    await persistCompletedTurn(storage, createStorageInput());
    await persistCompletedTurn(
      storage,
      createStorageInput({
        request: {
          ...createStorageInput().request,
          turnId: "turn-2",
          userText: "Now add tape-warped drums"
        },
        response: {
          ...createStorageInput().response,
          turnId: "turn-2",
          replyText: "Keep the earlier rain cue and add distant drums."
        }
      })
    );

    expect(storage.readJson?.("sessions/session-1.json")).toMatchObject({
      sessionId: "session-1",
      turns: [
        {
          turnId: "turn-1",
          userText: "Make it feel like midnight rain"
        },
        {
          turnId: "turn-2",
          userText: "Now add tape-warped drums"
        }
      ]
    });
  });

  it("returns null storage URLs when storage upload fails", async () => {
    const storage = createFakeTurnStorage("https://cdn.example.com");
    vi.spyOn(storage, "write").mockRejectedValue(new Error("upload unavailable"));

    const result = await persistCompletedTurn(storage, createStorageInput());

    expect(result).toEqual({
      snapshotUrl: null,
      turnJsonUrl: null
    });
  });
});
