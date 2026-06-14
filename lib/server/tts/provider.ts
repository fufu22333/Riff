import type { TtsCreateRequest, TtsJobResponse, TtsStatus } from "@/lib/contracts/tts";
import { getStorageKeys, type TurnStorage } from "@/lib/server/storage/provider";

type TtsJob = {
  request: TtsCreateRequest;
  response: TtsJobResponse;
  provider: "browser" | "fake" | "openai";
};

const jobs = new Map<string, TtsJob>();

function createJobId() {
  return `tts-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createResponse(status: TtsStatus, ttsJobId: string, ttsUrl: string | null = null): TtsJobResponse {
  return {
    status,
    ttsJobId,
    ttsUrl,
    errorCode: status === "failed" ? "tts_failed" : null
  };
}

function getTtsProvider() {
  if (process.env.TTS_PROVIDER === "fake" || process.env.TTS_PROVIDER === "openai") {
    return process.env.TTS_PROVIDER;
  }

  return "browser";
}

function createFakeMp3Body(request: TtsCreateRequest) {
  return Buffer.from(`RIFF fake tts\nvoice=${request.voice ?? "default"}\nspeed=${request.speed}\n${request.replyText}`);
}

export function createTtsJob(request: TtsCreateRequest): TtsJobResponse {
  const ttsJobId = createJobId();
  const provider = getTtsProvider();
  const response = createResponse(provider === "browser" ? "fallback" : "pending", ttsJobId);

  jobs.set(ttsJobId, {
    request,
    response,
    provider
  });

  return response;
}

export async function resolveTtsJob(ttsJobId: string, storage: TurnStorage): Promise<TtsJobResponse | null> {
  const job = jobs.get(ttsJobId);

  if (!job) {
    return null;
  }

  if (job.response.status !== "pending") {
    return job.response;
  }

  try {
    if (process.env.FAKE_TTS_SHOULD_FAIL === "true") {
      throw new Error("Fake TTS failure requested");
    }

    if (job.provider === "openai") {
      throw new Error("OpenAI TTS adapter is not configured in this demo build");
    }

    const audioKey = getStorageKeys(job.request.sessionId, job.request.turnId, ttsJobId).audio;
    await storage.write(audioKey, createFakeMp3Body(job.request), "audio/mpeg");

    job.response = createResponse("ready", ttsJobId, storage.publicUrl(audioKey));
  } catch {
    job.response = createResponse("failed", ttsJobId);
  }

  jobs.set(ttsJobId, job);
  return job.response;
}
