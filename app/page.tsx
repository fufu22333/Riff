"use client";

import { Camera, MessageSquareText, Mic2, Server } from "lucide-react";
import React, { useRef, useState } from "react";

import { CameraPreview, type CameraPreviewHandle } from "@/components/camera/CameraPreview";
import { MusicSuggestionCard } from "@/components/chat/MusicSuggestionCard";
import { VisualEvidence } from "@/components/chat/VisualEvidence";
import { VoiceRecorder } from "@/components/recorder/VoiceRecorder";
import type { SnapshotPayload } from "@/lib/client/camera";
import type { ChatResponse } from "@/lib/contracts/chat";

const statusItems = [
  { label: "Camera", value: "Preview ready", icon: Camera },
  { label: "Mic / VAD", value: "ASR ready", icon: Mic2 },
  { label: "Storage", value: "Server only", icon: Server }
];

type ConversationTurn = {
  sessionId: string;
  turnId: string;
  userText: string;
  snapshot: SnapshotPayload | null;
  status: "submitting" | "ready" | "failed";
  response: ChatResponse | null;
  failureReason: "vision_api_failed" | null;
};

function createTurnId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `turn-${Date.now()}`;
}

function createHistorySummary(turns: ConversationTurn[]) {
  return turns
    .filter((turn) => turn.status === "ready" && turn.response)
    .slice(-4)
    .map((turn) => `User: ${turn.userText}\nRiff: ${turn.response?.replyText}`)
    .join("\n\n");
}

function CloudEvidence({ qiniu }: { qiniu: ChatResponse["qiniu"] }) {
  const hasSnapshotUrl = Boolean(qiniu?.snapshotUrl);
  const hasTurnJsonUrl = Boolean(qiniu?.turnJsonUrl);

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase text-slate-500">Cloud evidence</p>
      {hasSnapshotUrl || hasTurnJsonUrl ? (
        <div className="mt-2 grid gap-2 text-sm">
          {qiniu?.snapshotUrl ? (
            <a className="break-all font-medium text-signal underline-offset-4 hover:underline" href={qiniu.snapshotUrl}>
              {qiniu.snapshotUrl}
            </a>
          ) : null}
          {qiniu?.turnJsonUrl ? (
            <a className="break-all font-medium text-signal underline-offset-4 hover:underline" href={qiniu.turnJsonUrl}>
              {qiniu.turnJsonUrl}
            </a>
          ) : null}
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate-600">Storage evidence is unavailable for this turn.</p>
      )}
    </div>
  );
}

export default function Home() {
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const sessionIdRef = useRef(`session-${Date.now()}`);
  const cameraPreviewRef = useRef<CameraPreviewHandle>(null);

  async function submitChat(userText: string) {
    const turnId = createTurnId();
    const snapshotForTurn = cameraPreviewRef.current?.captureSnapshot() ?? null;
    const historySummary = createHistorySummary(turns);

    setTurns((currentTurns) => [
      ...currentTurns,
      {
        sessionId: sessionIdRef.current,
        turnId,
        userText,
        snapshot: snapshotForTurn,
        status: "submitting",
        response: null,
        failureReason: null
      }
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          turnId,
          userText,
          snapshot: snapshotForTurn,
          motionSignal: null,
          historySummary
        })
      });
      const body = (await response.json()) as ChatResponse;

      if (!response.ok) {
        throw new Error("Chat failed");
      }

      setTurns((currentTurns) =>
        currentTurns.map((turn) =>
          turn.turnId === turnId ? { ...turn, status: "ready", response: body, failureReason: null } : turn
        )
      );
    } catch {
      setTurns((currentTurns) =>
        currentTurns.map((turn) =>
          turn.turnId === turnId
            ? { ...turn, status: "failed", response: null, failureReason: "vision_api_failed" }
            : turn
        )
      );
    }
  }

  return (
    <main className="min-h-screen bg-stage text-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 px-5 py-5">
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-signal">Visual music partner</p>
            <h1 className="mt-1 text-4xl font-semibold">Riff</h1>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            Capture a visual scene, speak a creative intent, and send both into a structured music conversation turn.
          </p>
        </header>

        <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.9fr)]">
          <div className="flex flex-col gap-4">
            <section
              aria-label="Camera workspace"
              className="flex min-h-[420px] flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">Camera workspace</h2>
                  <p className="mt-1 text-sm text-slate-600">Live preview, permission fallback, and snapshot capture.</p>
                </div>
                <Camera className="h-6 w-6 text-signal" aria-hidden="true" />
              </div>

              <CameraPreview ref={cameraPreviewRef} />
            </section>

            <VoiceRecorder onTranscript={(userText) => void submitChat(userText)} />
          </div>

          <section
            aria-label="Conversation workspace"
            className="flex min-h-[420px] flex-col rounded-lg border border-slate-200 bg-white shadow-sm"
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4">
              <div>
                <h2 className="text-xl font-semibold">Conversation workspace</h2>
                <p className="mt-1 text-sm text-slate-600">ASR transcripts now submit to structured visual music replies.</p>
              </div>
              <MessageSquareText className="h-6 w-6 text-signal" aria-hidden="true" />
            </div>

            <div className="flex flex-1 flex-col gap-3 p-4">
              {turns.length === 0 ? (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-500">Waiting for ASR input</p>
                  <p className="mt-2 text-base leading-6 text-slate-800">
                    Each turn will keep the user transcript, AI reply, visual evidence, and music suggestion together.
                  </p>
                </div>
              ) : null}

              {turns.map((turn, index) => (
                <article key={turn.turnId} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-500">Turn {index + 1}</p>
                    <p className="text-xs font-medium uppercase text-slate-500">{turn.status}</p>
                  </div>

                  <div className="mt-3 rounded-md bg-slate-50 px-3 py-3">
                    <p className="text-xs font-medium uppercase text-slate-500">User transcript</p>
                    <p className="mt-1 text-base text-slate-900">{turn.userText}</p>
                  </div>

                  {turn.status === "submitting" ? (
                    <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                      Asking Riff for a structured visual music response.
                    </p>
                  ) : null}

                  {turn.failureReason ? (
                    <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900" role="status">
                      <span className="font-semibold">{turn.failureReason}</span>
                      <span className="ml-2">The current turn stayed in transcript-only fallback.</span>
                    </div>
                  ) : null}

                  {turn.response ? (
                    <div className="mt-3 flex flex-col gap-3">
                      <div className="rounded-md border border-slate-200 bg-white p-3">
                        <p className="text-xs font-medium uppercase text-slate-500">AI response</p>
                        <p className="mt-2 text-base leading-6 text-slate-800">{turn.response.replyText}</p>
                        {turn.response.followUpQuestion ? (
                          <p className="mt-2 text-sm font-medium text-signal">{turn.response.followUpQuestion}</p>
                        ) : null}
                      </div>
                      <VisualEvidence observation={turn.response.visualObservation} />
                      <MusicSuggestionCard
                        suggestion={turn.response.musicSuggestion}
                        suggestedActions={turn.response.suggestedActions}
                      />
                      <CloudEvidence qiniu={turn.response.qiniu} />
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        </div>

        <footer
          role="contentinfo"
          aria-label="Status workspace"
          className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-3"
        >
          {statusItems.map((item) => {
            const Icon = item.icon;

            return (
              <div key={item.label} className="flex items-center gap-3 rounded-md bg-slate-50 px-3 py-3">
                <Icon className="h-5 w-5 text-signal" aria-hidden="true" />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{item.label}</p>
                  <p className="text-sm font-semibold text-slate-800">{item.value}</p>
                </div>
              </div>
            );
          })}
        </footer>
      </div>
    </main>
  );
}
