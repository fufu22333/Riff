import { NextResponse } from "next/server";

import { ttsJobResponseSchema } from "@/lib/contracts/tts";
import { createFakeTurnStorage } from "@/lib/server/storage/provider";
import { createQiniuTurnStorage } from "@/lib/server/storage/qiniu";
import { resolveTtsJob } from "@/lib/server/tts/provider";

export const runtime = "nodejs";

const fakeTurnStorage = createFakeTurnStorage();

function getTurnStorage() {
  if (process.env.STORAGE_PROVIDER === "qiniu") {
    return createQiniuTurnStorage();
  }

  return fakeTurnStorage;
}

export async function GET(_request: Request, context: { params: { jobId: string } }) {
  let response;

  try {
    response = await resolveTtsJob(context.params.jobId, getTurnStorage());
  } catch {
    response = {
      status: "failed" as const,
      ttsJobId: context.params.jobId,
      ttsUrl: null,
      errorCode: "tts_failed" as const
    };
  }

  if (!response) {
    return NextResponse.json(
      ttsJobResponseSchema.parse({
        status: "failed",
        ttsJobId: context.params.jobId,
        ttsUrl: null,
        errorCode: "tts_failed"
      }),
      { status: 404 }
    );
  }

  return NextResponse.json(ttsJobResponseSchema.parse(response));
}
