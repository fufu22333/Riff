import type { ChatRequest, ChatResponse } from "@/lib/contracts/chat";

export type StorageUrls = {
  snapshotUrl: string | null;
  turnJsonUrl: string | null;
};

export type CompletedTurnStorageInput = {
  request: ChatRequest;
  response: ChatResponse;
};

export type StoredTurnSummary = {
  turnId: string;
  userText: string;
  snapshotUrl: string | null;
  turnJsonUrl: string;
  replyText: string;
  createdAt: string;
};

export type StoredSession = {
  sessionId: string;
  updatedAt: string;
  turns: StoredTurnSummary[];
};

export type StorageBody = string | Uint8Array | Blob;

export type TurnStorage = {
  write(key: string, body: StorageBody, contentType: string): Promise<void>;
  publicUrl(key: string): string;
  readSession?(key: string): Promise<StoredSession | null>;
  readJson?(key: string): unknown;
};

const failedStorageUrls: StorageUrls = {
  snapshotUrl: null,
  turnJsonUrl: null
};

export function getStorageKeys(sessionId: string, turnId: string, assetId = turnId) {
  return {
    snapshot: `snapshots/${sessionId}/${turnId}.webp`,
    turnJson: `turns/${sessionId}/${turnId}.json`,
    sessionJson: `sessions/${sessionId}.json`,
    audio: `audio/${sessionId}/${assetId}.mp3`
  };
}

function toJsonBody(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function snapshotBody(input: ChatRequest) {
  if (!input.snapshot) {
    return null;
  }

  return Buffer.from(input.snapshot.base64, "base64");
}

function mergeTurnIntoSession(sessionId: string, session: StoredSession | null, turn: StoredTurnSummary): StoredSession {
  const existingTurns = session?.turns.filter((candidate) => candidate.turnId !== turn.turnId) ?? [];

  return {
    sessionId: session?.sessionId ?? sessionId,
    updatedAt: turn.createdAt,
    turns: [...existingTurns, turn]
  };
}

export async function persistCompletedTurn(storage: TurnStorage, input: CompletedTurnStorageInput): Promise<StorageUrls> {
  try {
    const { sessionId, turnId } = input.request;
    const storageKeys = getStorageKeys(sessionId, turnId);
    const snapshotUrl = input.request.snapshot ? storage.publicUrl(storageKeys.snapshot) : null;
    const turnJsonUrl = storage.publicUrl(storageKeys.turnJson);
    const qiniu = { snapshotUrl, turnJsonUrl };
    const responseWithStorage: ChatResponse = {
      ...input.response,
      qiniu
    };
    const createdAt = new Date().toISOString();

    const snapshot = snapshotBody(input.request);
    if (snapshot) {
      await storage.write(storageKeys.snapshot, snapshot, input.request.snapshot?.mimeType ?? "image/webp");
    }

    await storage.write(
      storageKeys.turnJson,
      toJsonBody({
        request: input.request,
        response: responseWithStorage,
        createdAt
      }),
      "application/json"
    );

    const existingSession = (await storage.readSession?.(storageKeys.sessionJson)) ?? null;
    const session = mergeTurnIntoSession(sessionId, existingSession, {
      turnId,
      userText: input.request.userText,
      snapshotUrl,
      turnJsonUrl,
      replyText: input.response.replyText,
      createdAt
    });

    await storage.write(storageKeys.sessionJson, toJsonBody(session), "application/json");

    return qiniu;
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("Riff storage persistence failed", error);
    }
    return failedStorageUrls;
  }
}

export function createFakeTurnStorage(publicDomain = process.env.QINIU_PUBLIC_DOMAIN ?? "https://cdn.example.com"): TurnStorage {
  const objects = new Map<string, unknown>();
  const normalizedDomain = publicDomain.replace(/\/$/, "");

  return {
    async write(key, body) {
      if (process.env.FAKE_STORAGE_SHOULD_FAIL === "true") {
        throw new Error("Fake storage failure requested");
      }

      if (typeof body === "string") {
        try {
          objects.set(key, JSON.parse(body));
        } catch {
          objects.set(key, body);
        }
        return;
      }

      if (Buffer.isBuffer(body) && key.startsWith("snapshots/")) {
        objects.set(key, body.toString("base64"));
        return;
      }

      objects.set(key, body);
    },
    publicUrl(key) {
      return `${normalizedDomain}/${key}`;
    },
    async readSession(key) {
      const value = objects.get(key);
      if (!value || typeof value !== "object" || !("sessionId" in value)) {
        return null;
      }

      return value as StoredSession;
    },
    readJson(key) {
      return objects.get(key);
    }
  };
}
