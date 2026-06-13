import { NextResponse } from "next/server";

import { asrFailureSchema, asrSuccessSchema } from "@/lib/contracts/asr";
import { createFakeAsrProvider } from "@/lib/server/asr/fake";
import { createOpenAiAsrProvider } from "@/lib/server/asr/openai";
import type { AsrProvider } from "@/lib/server/asr/provider";

export const runtime = "nodejs";

function jsonFailure(status: number, message: string) {
  return NextResponse.json(asrFailureSchema.parse({ failureReason: "asr_failed", message }), { status });
}

function getAsrProvider(): AsrProvider {
  if (process.env.ASR_PROVIDER === "openai") {
    return createOpenAiAsrProvider();
  }

  return createFakeAsrProvider();
}

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return jsonFailure(400, "Request must be multipart form data");
  }

  const audio = formData.get("audio");

  if (!(audio instanceof Blob) || audio.size === 0) {
    return jsonFailure(400, "Audio file is required");
  }

  try {
    const filename = audio instanceof File ? audio.name : "audio.webm";
    const result = await getAsrProvider().transcribe({ audio, filename });
    return NextResponse.json(asrSuccessSchema.parse(result));
  } catch {
    return jsonFailure(502, "ASR provider failed");
  }
}
