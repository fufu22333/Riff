import { NextResponse } from "next/server";

import { chatRequestSchema, chatResponseSchema } from "@/lib/contracts/chat";
import { createFakeChatProvider } from "@/lib/server/ai/fake";
import { createOpenAiChatProvider } from "@/lib/server/ai/openai";
import type { ChatProvider } from "@/lib/server/ai/provider";
import { createVisionFallbackResponse } from "@/lib/server/ai/provider";
import {
  createFakeTurnStorage,
  persistCompletedTurn
} from "@/lib/server/storage/provider";
import { createQiniuTurnStorage } from "@/lib/server/storage/qiniu";
import type {
  CompletedTurnStorageInput,
  StorageUrls,
  TurnStorage
} from "@/lib/server/storage/provider";

export const runtime = "nodejs";

const fakeTurnStorage = createFakeTurnStorage();

function logRouteError(message: string, error: unknown) {
  if (process.env.NODE_ENV !== "test") {
    console.error(message, error);
  }
}

function jsonFailure(status: number, message: string) {
  return NextResponse.json(
    {
      failureReason: "vision_api_failed",
      message
    },
    { status }
  );
}

function getChatProvider(): ChatProvider {
  if (process.env.AI_PROVIDER === "openai") {
    return createOpenAiChatProvider();
  }

  return createFakeChatProvider();
}

function getTurnStorage(): TurnStorage {
  if (process.env.STORAGE_PROVIDER === "qiniu") {
    return createQiniuTurnStorage();
  }

  return fakeTurnStorage;
}

async function persistWithConfiguredStorage(
  input: CompletedTurnStorageInput
): Promise<StorageUrls> {
  try {
    return await persistCompletedTurn(getTurnStorage(), input);
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("Riff storage initialization failed", error);
    }

    return {
      snapshotUrl: null,
      turnJsonUrl: null
    };
  }
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    logRouteError("Riff chat route failed to parse request JSON", error);
    return jsonFailure(400, "Request must be JSON");
  }

  const parsedRequest = chatRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    logRouteError("Riff chat route received invalid request", parsedRequest.error.flatten());
    return jsonFailure(400, "Invalid chat request");
  }

  try {
    const providerResponse = await getChatProvider().complete(parsedRequest.data);
    const validatedResponse = chatResponseSchema.parse(providerResponse);

    const qiniu = await persistWithConfiguredStorage({
      request: parsedRequest.data,
      response: validatedResponse
    });

    return NextResponse.json(
      chatResponseSchema.parse({
        ...validatedResponse,
        qiniu
      })
    );
  } catch (error) {
    logRouteError("Riff chat provider failed", error);

    const fallbackResponse = chatResponseSchema.parse(
      createVisionFallbackResponse(parsedRequest.data)
    );

    const qiniu = await persistWithConfiguredStorage({
      request: parsedRequest.data,
      response: fallbackResponse
    });

    return NextResponse.json(
      chatResponseSchema.parse({
        ...fallbackResponse,
        qiniu
      })
    );
  }
}
