import { NextResponse } from "next/server";

import { chatRequestSchema, chatResponseSchema } from "@/lib/contracts/chat";
import { createFakeChatProvider } from "@/lib/server/ai/fake";
import { createOpenAiChatProvider } from "@/lib/server/ai/openai";
import type { ChatProvider } from "@/lib/server/ai/provider";
import { createVisionFallbackResponse } from "@/lib/server/ai/provider";

export const runtime = "nodejs";

function jsonFailure(status: number, message: string) {
  return NextResponse.json({ failureReason: "vision_api_failed", message }, { status });
}

function getChatProvider(): ChatProvider {
  if (process.env.AI_PROVIDER === "openai") {
    return createOpenAiChatProvider();
  }

  return createFakeChatProvider();
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonFailure(400, "Request must be JSON");
  }

  const parsedRequest = chatRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    return jsonFailure(400, "Invalid chat request");
  }

  try {
    const providerResponse = await getChatProvider().complete(parsedRequest.data);
    const validatedResponse = chatResponseSchema.parse(providerResponse);
    return NextResponse.json(validatedResponse);
  } catch {
    return NextResponse.json(chatResponseSchema.parse(createVisionFallbackResponse(parsedRequest.data)));
  }
}
