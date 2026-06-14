import type { GenerateCreateRequest, GenerateJobResponse, GenerateStatus } from "@/lib/contracts/generate";
import { fallbackSampleAudioContentType, readFallbackSampleAudio } from "@/lib/server/music/fallbackSample";
import { getStorageKeys, persistGenerationEvidence, type TurnStorage } from "@/lib/server/storage/provider";

type MusicJob = {
  request: GenerateCreateRequest;
  response: GenerateJobResponse;
  provider: "fake";
};

const jobs = new Map<string, MusicJob>();

function createJobId() {
  return `music-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createResponse(
  status: GenerateStatus,
  jobId: string,
  musicUrl: string | null = null
): GenerateJobResponse {
  return {
    status,
    jobId,
    musicUrl,
    errorCode: status === "failed" || status === "fallback_ready" ? "music_generation_failed" : null,
    usage: "reference_only",
    isExportable: false
  };
}

function createSilentWav(durationSeconds = 0.5, sampleRate = 8_000) {
  const sampleCount = Math.floor(durationSeconds * sampleRate);
  const dataSize = sampleCount * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  return buffer;
}

function createFakeWavBody(request: GenerateCreateRequest) {
  const prompt = Buffer.from(`\nRIFF fake reference track\nprompt=${request.promptForMusicGen}`);
  return Buffer.concat([createSilentWav(), prompt]);
}

function isMusicProviderAvailable() {
  return process.env.MUSIC_PROVIDER === "fake";
}

export function createFallbackMusicUrl(requestUrl: string) {
  return new URL("/api/generate/sample", requestUrl).toString();
}

async function persistReferenceTrack(
  storage: TurnStorage,
  request: GenerateCreateRequest,
  jobId: string,
  status: "ready" | "fallback_ready",
  body: Uint8Array
) {
  const audioKey = getStorageKeys(request.sessionId, request.turnId, jobId, "wav").audio;
  await storage.write(audioKey, body, fallbackSampleAudioContentType);

  const musicUrl = storage.publicUrl(audioKey);
  await persistGenerationEvidence(storage, {
    sessionId: request.sessionId,
    turnId: request.turnId,
    generationJobId: jobId,
    musicUrl,
    generationStatus: status,
    usage: "reference_only"
  });

  return musicUrl;
}

export async function createMusicGenerationJob(
  request: GenerateCreateRequest,
  storage: TurnStorage
): Promise<GenerateJobResponse> {
  const jobId = createJobId();

  if (!isMusicProviderAvailable()) {
    try {
      const musicUrl = await persistReferenceTrack(storage, request, jobId, "fallback_ready", await readFallbackSampleAudio());
      return createResponse("fallback_ready", jobId, musicUrl);
    } catch {
      return createResponse("failed", jobId);
    }
  }

  const response = createResponse("queued", jobId);
  jobs.set(jobId, {
    request,
    response,
    provider: "fake"
  });

  return response;
}

export async function resolveMusicGenerationJob(
  jobId: string,
  storage: TurnStorage
): Promise<GenerateJobResponse | null> {
  const job = jobs.get(jobId);

  if (!job) {
    return null;
  }

  if (job.response.status === "ready" || job.response.status === "fallback_ready" || job.response.status === "failed") {
    return job.response;
  }

  try {
    if (process.env.FAKE_MUSIC_SHOULD_FAIL === "true") {
      throw new Error("Fake music generation failure requested");
    }

    const musicUrl = await persistReferenceTrack(storage, job.request, jobId, "ready", createFakeWavBody(job.request));
    job.response = createResponse("ready", jobId, musicUrl);
  } catch {
    try {
      const musicUrl = await persistReferenceTrack(
        storage,
        job.request,
        jobId,
        "fallback_ready",
        await readFallbackSampleAudio()
      );
      job.response = createResponse("fallback_ready", jobId, musicUrl);
    } catch {
      job.response = createResponse("failed", jobId);
    }
  }

  jobs.set(jobId, job);
  return job.response;
}
