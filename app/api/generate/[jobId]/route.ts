import { NextResponse } from "next/server";

import { generateJobResponseSchema } from "@/lib/contracts/generate";
import { resolveMusicGenerationJob } from "@/lib/server/music/provider";
import { createFakeTurnStorage } from "@/lib/server/storage/provider";
import { createQiniuTurnStorage } from "@/lib/server/storage/qiniu";

export const runtime = "nodejs";

const fakeTurnStorage = createFakeTurnStorage();

function getTurnStorage() {
  if (process.env.STORAGE_PROVIDER === "qiniu") {
    return createQiniuTurnStorage();
  }

  return fakeTurnStorage;
}

function failedResponse(jobId: string) {
  return generateJobResponseSchema.parse({
    status: "failed",
    jobId,
    musicUrl: null,
    errorCode: "music_generation_failed",
    usage: "reference_only",
    isExportable: false
  });
}

export async function GET(_request: Request, context: { params: { jobId: string } }) {
  let response;

  try {
    response = await resolveMusicGenerationJob(context.params.jobId, getTurnStorage());
  } catch {
    response = failedResponse(context.params.jobId);
  }

  if (!response) {
    return NextResponse.json(failedResponse(context.params.jobId), { status: 404 });
  }

  return NextResponse.json(generateJobResponseSchema.parse(response));
}
