"use client";

import { Camera, MessageSquareText, Mic2, Music2, Server } from "lucide-react";
import React, { useRef, useState } from "react";

import { CameraPreview } from "@/components/camera/CameraPreview";
import { VoiceRecorder } from "@/components/recorder/VoiceRecorder";
import type { SnapshotPayload } from "@/lib/client/camera";
import type { ChatResponse } from "@/lib/contracts/chat";

const statusItems = [
  { label: "Camera", value: "Preview ready", icon: Camera },
  { label: "Mic / VAD", value: "ASR ready", icon: Mic2 },
  { label: "Storage", value: "Server only", icon: Server }
];

export default function Home() {
  const [latestTranscript, setLatestTranscript] = useState("");
  const [latestSnapshot, setLatestSnapshot] = useState<SnapshotPayload | null>(null);
  const [chatResponse, setChatResponse] = useState<ChatResponse | null>(null);
  const [chatStatus, setChatStatus] = useState<"idle" | "submitting" | "ready" | "failed">("idle");
  const [chatFailure, setChatFailure] = useState("");
  const sessionIdRef = useRef(`session-${Date.now()}`);

  async function submitChat(userText: string) {
    const turnId =
      typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `turn-${Date.now()}`;

    setLatestTranscript(userText);
    setChatStatus("submitting");
    setChatFailure("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          turnId,
          userText,
          snapshot: latestSnapshot,
          motionSignal: null,
          historySummary: ""
        })
      });
      const body = (await response.json()) as ChatResponse;

      if (!response.ok) {
        throw new Error("Chat failed");
      }

      setChatResponse(body);
      setChatStatus("ready");
    } catch {
      setChatStatus("failed");
      setChatFailure("vision_api_failed");
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

              <CameraPreview onSnapshot={setLatestSnapshot} />
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
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">User transcript</p>
                <p className="mt-2 text-base text-slate-800">
                  {latestTranscript || "Waiting for ASR input."}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-sm font-medium text-slate-500">AI response</p>
                <p className="mt-2 text-base leading-6 text-slate-800">
                  {chatStatus === "submitting"
                    ? "Asking Riff for a structured visual music response."
                    : chatStatus === "failed"
                      ? "Chat failed; keep the transcript and try the next turn."
                      : chatResponse?.replyText ||
                        "The response will always include visual evidence or a clear visual failure reason."}
                </p>
              </div>
              {chatResponse ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-500">Visual evidence</p>
                  <p className="mt-2 text-sm leading-6 text-slate-800">
                    {chatResponse.visualObservation.isUsable
                      ? chatResponse.visualObservation.summary
                      : chatResponse.visualObservation.failureReason}
                  </p>
                </div>
              ) : null}
              {chatFailure ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900" role="status">
                  <span className="font-semibold">{chatFailure}</span>
                  <span className="ml-2">The current turn stayed in transcript-only fallback.</span>
                </div>
              ) : null}
              <div className="mt-auto rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                  <Music2 className="h-4 w-4" aria-hidden="true" />
                  Music suggestion shell
                </div>
                <p className="mt-2 text-sm leading-6 text-amber-900">
                  {chatResponse
                    ? [
                        chatResponse.musicSuggestion.mood,
                        chatResponse.musicSuggestion.tempo,
                        chatResponse.musicSuggestion.instruments.join(", "),
                        chatResponse.musicSuggestion.structure
                      ]
                        .filter(Boolean)
                        .join(" | ")
                    : "Mood, tempo, instruments, and structure will render here after the first chat turn."}
                </p>
              </div>
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
