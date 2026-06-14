// @vitest-environment node

import { existsSync, statSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/generate/route";
import { GET } from "@/app/api/generate/[jobId]/route";
import { GET as GET_SAMPLE } from "@/app/api/generate/sample/route";
import { generateJobResponseSchema } from "@/lib/contracts/generate";
import { fallbackSampleAudioPath } from "@/lib/server/music/fallbackSample";
import { createMusicGenerationJob } from "@/lib/server/music/provider";
import { createFakeTurnStorage, persistCompletedTurn } from "@/lib/server/storage/provider";

function wavHasAudiblePcmData(bytes: Uint8Array) {
  const dataOffset = 44;

  for (let offset = dataOffset; offset + 1 < bytes.length; offset += 2) {
    if ((bytes[offset] ?? 0) !== 0 || (bytes[offset + 1] ?? 0) !== 0) {
      return true;
    }
  }

  return false;
}

async function postGenerate(overrides: Record<string, unknown> = {}) {
  return POST(
    new Request("http://localhost/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId: "session-1",
        turnId: "turn-1",
        promptForMusicGen: "midnight rain sparse felt piano",
        ...overrides
      })
    })
  );
}

async function getGenerate(jobId: string) {
  return GET(new Request(`http://localhost/api/generate/${jobId}`), { params: { jobId } });
}

describe("music generation API", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("creates a queued fake generation job and resolves it to a stored music URL", async () => {
    vi.stubEnv("MUSIC_PROVIDER", "fake");
    vi.stubEnv("STORAGE_PROVIDER", "fake");

    const created = await postGenerate();
    const createdBody = await created.json();

    expect(created.status).toBe(202);
    expect(createdBody).toMatchObject({
      status: "queued",
      jobId: expect.any(String),
      musicUrl: null,
      errorCode: null,
      usage: "reference_only",
      isExportable: false
    });
    expect(createdBody).not.toHaveProperty("downloadUrl");
    expect(createdBody).not.toHaveProperty("exportUrl");

    const polled = await getGenerate(createdBody.jobId);
    const polledBody = await polled.json();

    expect(polled.status).toBe(200);
    expect(polledBody).toEqual({
      status: "ready",
      jobId: createdBody.jobId,
      musicUrl: `https://cdn.example.com/audio/session-1/${createdBody.jobId}.wav`,
      errorCode: null,
      usage: "reference_only",
      isExportable: false
    });
    expect(generateJobResponseSchema.parse(polledBody).musicUrl).toContain("/audio/session-1/");
  });

  it("returns a playable pregenerated fallback when the provider is unavailable", async () => {
    vi.stubEnv("MUSIC_PROVIDER", "disabled");
    vi.stubEnv("STORAGE_PROVIDER", "fake");

    const response = await postGenerate();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      status: "fallback_ready",
      jobId: expect.any(String),
      musicUrl: expect.stringMatching(/^https:\/\/cdn\.example\.com\/audio\/session-1\/music-/),
      errorCode: "music_generation_failed",
      usage: "reference_only",
      isExportable: false
    });
    expect(body.musicUrl).toMatch(/\.wav$/);
  });

  it("stores the pregenerated fallback sample when the provider is unavailable", async () => {
    vi.stubEnv("MUSIC_PROVIDER", "disabled");

    const storage = createFakeTurnStorage("https://cdn.example.com");
    const response = await createMusicGenerationJob(
      {
        sessionId: "session-1",
        turnId: "turn-1",
        promptForMusicGen: "midnight rain sparse felt piano"
      },
      storage
    );

    const storedAudio = storage.readJson?.(`audio/session-1/${response.jobId}.wav`);
    expect(response.status).toBe("fallback_ready");
    expect(storedAudio).toBeInstanceOf(Uint8Array);
    expect(wavHasAudiblePcmData(storedAudio as Uint8Array)).toBe(true);
  });

  it("falls back to a stored playable reference sample when generation fails", async () => {
    vi.stubEnv("MUSIC_PROVIDER", "fake");
    vi.stubEnv("STORAGE_PROVIDER", "fake");
    vi.stubEnv("FAKE_MUSIC_SHOULD_FAIL", "true");

    const created = await postGenerate();
    const createdBody = await created.json();
    const polled = await getGenerate(createdBody.jobId);
    const polledBody = await polled.json();

    expect(polled.status).toBe(200);
    expect(polledBody).toEqual({
      status: "fallback_ready",
      jobId: createdBody.jobId,
      musicUrl: `https://cdn.example.com/audio/session-1/${createdBody.jobId}.wav`,
      errorCode: "music_generation_failed",
      usage: "reference_only",
      isExportable: false
    });
  });

  it("writes generation evidence back to turn and session JSON", async () => {
    vi.stubEnv("MUSIC_PROVIDER", "fake");
    vi.stubEnv("STORAGE_PROVIDER", "fake");

    const storage = createFakeTurnStorage("https://cdn.example.com");
    await persistCompletedTurn(storage, {
      request: {
        sessionId: "session-2",
        turnId: "turn-2",
        userText: "Make a reference track from this scene",
        snapshot: null,
        motionSignal: null,
        historySummary: ""
      },
      response: {
        sessionId: "session-2",
        turnId: "turn-2",
        replyText: "Here is a grounded reference direction.",
        visualObservation: {
          isUsable: false,
          summary: null,
          objects: [],
          sceneMood: null,
          motionEnergy: null,
          confidence: 0,
          failureReason: "no_visual_subject"
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
      }
    });

    const { createMusicGenerationJob, resolveMusicGenerationJob } = await import("@/lib/server/music/provider");
    const created = await createMusicGenerationJob(
      {
        sessionId: "session-2",
        turnId: "turn-2",
        promptForMusicGen: "midnight rain sparse felt piano"
      },
      storage
    );
    const resolved = await resolveMusicGenerationJob(created.jobId, storage);

    expect(resolved?.status).toBe("ready");
    expect(storage.readJson?.(`audio/session-2/${created.jobId}.wav`)).toBeInstanceOf(Uint8Array);
    expect(storage.readJson?.("turns/session-2/turn-2.json")).toMatchObject({
      generation: {
        generationJobId: created.jobId,
        musicUrl: `https://cdn.example.com/audio/session-2/${created.jobId}.wav`,
        generationStatus: "ready",
        usage: "reference_only"
      }
    });
    expect(storage.readJson?.("sessions/session-2.json")).toMatchObject({
      turns: [
        {
          turnId: "turn-2",
          generationJobId: created.jobId,
          musicUrl: `https://cdn.example.com/audio/session-2/${created.jobId}.wav`,
          generationStatus: "ready",
          usage: "reference_only"
        }
      ]
    });
  });

  it("rejects malformed generation requests without leaking provider details", async () => {
    const response = await postGenerate({ promptForMusicGen: "" });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.errorCode).toBe("music_generation_failed");
    expect(body).not.toHaveProperty("downloadUrl");
    expect(body).not.toHaveProperty("exportUrl");
  });

  it("serves the pregenerated fallback sample as browser-playable audio", async () => {
    const response = await GET_SAMPLE();
    const bytes = new Uint8Array(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("audio/wav");
    expect(bytes.byteLength).toBeGreaterThan(44);
    expect(wavHasAudiblePcmData(bytes)).toBe(true);
  });

  it("keeps the pregenerated fallback sample on disk with audio content", () => {
    expect(fallbackSampleAudioPath).toContain("public");
    expect(existsSync(fallbackSampleAudioPath)).toBe(true);
    expect(statSync(fallbackSampleAudioPath).size).toBeGreaterThan(44);
  });
});
