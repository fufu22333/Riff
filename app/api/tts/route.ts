import { NextResponse } from "next/server";

import { ttsCreateRequestSchema, ttsJobResponseSchema } from "@/lib/contracts/tts";
import { createTtsJob } from "@/lib/server/tts/provider";

export const runtime = "nodejs";

function ttsFailure(status: number, ttsJobId = "invalid-request") {
  return NextResponse.json(
    ttsJobResponseSchema.parse({
      status: "failed",
      ttsJobId,
      ttsUrl: null,
      errorCode: "tts_failed"
    }),
    { status }
  );
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return ttsFailure(400);
  }

  const parsedRequest = ttsCreateRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    return ttsFailure(400);
  }

  const response = ttsJobResponseSchema.parse(createTtsJob(parsedRequest.data));
  return NextResponse.json(response, { status: response.status === "pending" ? 202 : 200 });
}
