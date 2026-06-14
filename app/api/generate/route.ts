import { NextResponse } from "next/server";

import { generateCreateRequestSchema, generateJobResponseSchema } from "@/lib/contracts/generate";
import { createMusicGenerationJob } from "@/lib/server/music/provider";
import { createFakeTurnStorage, type TurnStorage } from "@/lib/server/storage/provider";
import { createQiniuTurnStorage } from "@/lib/server/storage/qiniu";

export const runtime = "nodejs";

const fakeTurnStorage = createFakeTurnStorage();

function getTurnStorage(): TurnStorage {
  if (process.env.STORAGE_PROVIDER === "qiniu") {
    return createQiniuTurnStorage();
  }

  return fakeTurnStorage;
}

function generateFailure(status: number, jobId = "invalid-request") {
  return NextResponse.json(
    generateJobResponseSchema.parse({
      status: "failed",
      jobId,
      musicUrl: null,
      errorCode: "music_generation_failed",
      usage: "reference_only",
      isExportable: false
    }),
    { status }
  );
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return generateFailure(400);
  }

  const parsedRequest = generateCreateRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    return generateFailure(400);
  }

  const response = generateJobResponseSchema.parse(await createMusicGenerationJob(parsedRequest.data, getTurnStorage()));
  return NextResponse.json(response, { status: response.status === "queued" ? 202 : 200 });
}
