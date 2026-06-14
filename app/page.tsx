"use client";

import { Camera, MessageSquareText, Mic2, Server, Volume2 } from "lucide-react";
import React, { useRef, useState } from "react";

import { CameraPreview, type CameraPreviewHandle } from "@/components/camera/CameraPreview";
import { MusicSuggestionCard } from "@/components/chat/MusicSuggestionCard";
import { VisualEvidence } from "@/components/chat/VisualEvidence";
import { VoiceRecorder } from "@/components/recorder/VoiceRecorder";
import type { SnapshotPayload } from "@/lib/client/camera";
import type { ChatResponse } from "@/lib/contracts/chat";
import type { GenerateJobResponse } from "@/lib/contracts/generate";
import type { TtsJobResponse } from "@/lib/contracts/tts";

const statusItems = [
  { label: "摄像头", value: "可预览", icon: Camera },
  { label: "麦克风", value: "可识别", icon: Mic2 },
  { label: "存储", value: "服务端", icon: Server }
];

type ConversationTurn = {
  sessionId: string;
  turnId: string;
  userText: string;
  snapshot: SnapshotPayload | null;
  status: "submitting" | "ready" | "failed";
  response: ChatResponse | null;
  tts: TtsJobResponse | null;
  generation: GenerateJobResponse | null;
  failureReason: "vision_api_failed" | null;
};

function createTurnId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `turn-${Date.now()}`;
}

function createHistorySummary(turns: ConversationTurn[]) {
  return turns
    .filter((turn) => turn.status === "ready" && turn.response)
    .slice(-4)
    .map((turn) => `用户：${turn.userText}\nRiff：${turn.response?.replyText}`)
    .join("\n\n");
}

function formatTurnStatus(status: ConversationTurn["status"]) {
  if (status === "submitting") {
    return "理解中";
  }

  if (status === "ready") {
    return "已完成";
  }

  return "失败";
}

function CloudEvidence({ qiniu }: { qiniu: ChatResponse["qiniu"] }) {
  const hasSnapshotUrl = Boolean(qiniu?.snapshotUrl);
  const hasTurnJsonUrl = Boolean(qiniu?.turnJsonUrl);

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase text-slate-500">云端记录</p>
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
        <p className="mt-2 text-sm text-slate-600">这一轮没有可用的云端记录。</p>
      )}
    </div>
  );
}

function TtsStatusPanel({ tts }: { tts: TtsJobResponse | null }) {
  if (!tts) {
    return null;
  }

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3" role="status">
      <div className="flex items-center gap-2">
        <Volume2 className="h-4 w-4 text-signal" aria-hidden="true" />
        <p className="text-xs font-medium uppercase text-slate-500">TTS</p>
        <p className="text-sm font-semibold text-slate-800">{tts.status}</p>
      </div>
      {tts.status === "ready" && tts.ttsUrl ? (
        <audio className="mt-3 w-full" controls src={tts.ttsUrl}>
          <track kind="captions" />
        </audio>
      ) : null}
      {tts.status === "fallback" ? (
        <p className="mt-2 text-sm text-slate-600">正在使用浏览器自带朗读。</p>
      ) : null}
      {tts.status === "failed" ? (
        <p className="mt-2 text-sm text-rose-700">语音朗读失败，但文字回复保留，你可以继续下一轮。</p>
      ) : null}
    </div>
  );
}

function ReferenceTrackPanel({ generation }: { generation: GenerateJobResponse | null }) {
  if (!generation) {
    return null;
  }

  const playableUrl = generation.musicUrl;
  const urlSource = playableUrl?.includes("cdn.example.com") || playableUrl?.includes("qiniu") ? "CDN 地址" : "可播放地址";

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3" role="status">
      <div className="flex items-center gap-2">
        <Volume2 className="h-4 w-4 text-signal" aria-hidden="true" />
        <p className="text-xs font-medium uppercase text-slate-500">参考音频</p>
        <p className="text-sm font-semibold text-slate-800">{generation.status}</p>
        <p className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
          仅供参考
        </p>
      </div>
      <p className="mt-2 text-sm text-slate-600">当前不是完整可商用生成，只是本地/兜底参考音频。</p>
      {playableUrl ? (
        <>
          <audio className="mt-3 w-full" controls controlsList="nodownload" src={playableUrl}>
            <track kind="captions" />
          </audio>
          <p className="mt-2 break-all text-xs text-slate-500">Source: {urlSource} · {playableUrl}</p>
        </>
      ) : null}
      {generation.errorCode ? (
        <p className="mt-2 text-sm text-rose-700">
          真实音乐生成未完成或未配置。当前播放的是预置兜底样例，不代表已经真正生成了一首歌。
        </p>
      ) : null}
    </div>
  );
}

export default function Home() {
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const sessionIdRef = useRef(`session-${Date.now()}`);
  const cameraPreviewRef = useRef<CameraPreviewHandle>(null);

  function updateTurnTts(turnId: string, tts: TtsJobResponse) {
    setTurns((currentTurns) => currentTurns.map((turn) => (turn.turnId === turnId ? { ...turn, tts } : turn)));
  }

  function updateTurnGeneration(turnId: string, generation: GenerateJobResponse) {
    setTurns((currentTurns) =>
      currentTurns.map((turn) => (turn.turnId === turnId ? { ...turn, generation } : turn))
    );
  }

  function speakWithBrowserFallback(text: string) {
    const synthesis = globalThis.window?.speechSynthesis;

    if (!synthesis || typeof SpeechSynthesisUtterance === "undefined") {
      return;
    }

    synthesis.cancel();
    synthesis.speak(new SpeechSynthesisUtterance(text));
  }

  async function startTts(turnId: string, response: ChatResponse) {
    try {
      const created = await fetch("/api/tts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: response.sessionId,
          turnId: response.turnId,
          replyText: response.replyText
        })
      });
      const createdBody = (await created.json()) as TtsJobResponse;
      updateTurnTts(turnId, createdBody);

      if (createdBody.status === "fallback" || createdBody.status === "failed") {
        speakWithBrowserFallback(response.replyText);
        return;
      }

      if (createdBody.status === "pending" && createdBody.ttsJobId) {
        const polled = await fetch(`/api/tts/${createdBody.ttsJobId}`);
        const polledBody = (await polled.json()) as TtsJobResponse;
        updateTurnTts(turnId, polledBody);

        if (polledBody.status === "failed" || polledBody.status === "fallback") {
          speakWithBrowserFallback(response.replyText);
        }
      }
    } catch {
      updateTurnTts(turnId, {
        status: "failed",
        ttsJobId: `tts-failed-${turnId}`,
        ttsUrl: null,
        errorCode: "tts_failed"
      });
      speakWithBrowserFallback(response.replyText);
    }
  }

  async function startMusicGeneration(turn: ConversationTurn) {
    if (!turn.response?.musicSuggestion.promptForMusicGen) {
      return;
    }

    try {
      const created = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: turn.response.sessionId,
          turnId: turn.response.turnId,
          promptForMusicGen: turn.response.musicSuggestion.promptForMusicGen
        })
      });
      const createdBody = (await created.json()) as GenerateJobResponse;
      updateTurnGeneration(turn.turnId, createdBody);

      if (createdBody.status === "queued" || createdBody.status === "processing") {
        const polled = await fetch(`/api/generate/${createdBody.jobId}`);
        const polledBody = (await polled.json()) as GenerateJobResponse;
        updateTurnGeneration(turn.turnId, polledBody);
      }
    } catch {
      updateTurnGeneration(turn.turnId, {
        status: "failed",
        jobId: `music-failed-${turn.turnId}`,
        musicUrl: null,
        errorCode: "music_generation_failed",
        usage: "reference_only",
        isExportable: false
      });
    }
  }

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
        tts: null,
        generation: null,
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
      void startTts(turnId, body);
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
            <p className="text-sm font-medium uppercase tracking-wide text-signal">视觉音乐伙伴</p>
            <h1 className="mt-1 text-4xl font-semibold">Riff</h1>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            打开摄像头，说出你的想法，Riff 会结合画面和语音与你讨论音乐方向。
          </p>
        </header>

        <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.9fr)]">
          <div className="flex flex-col gap-4">
            <section
              aria-label="摄像头区域"
              className="flex min-h-[420px] flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">摄像头</h2>
                  <p className="mt-1 text-sm text-slate-600">实时预览，并在每次对话时截取当前画面给 AI。</p>
                </div>
                <Camera className="h-6 w-6 text-signal" aria-hidden="true" />
              </div>

              <CameraPreview ref={cameraPreviewRef} />
            </section>

            <VoiceRecorder onTranscript={(userText) => void submitChat(userText)} />
          </div>

          <section
            aria-label="对话区域"
            className="flex min-h-[420px] flex-col rounded-lg border border-slate-200 bg-white shadow-sm"
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4">
              <div>
                <h2 className="text-xl font-semibold">对话</h2>
                <p className="mt-1 text-sm text-slate-600">你的语音会转成文字，并和当前画面一起发送给 AI。</p>
              </div>
              <MessageSquareText className="h-6 w-6 text-signal" aria-hidden="true" />
            </div>

            <div className="flex flex-1 flex-col gap-3 p-4">
              {turns.length === 0 ? (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-500">等待你说话</p>
                  <p className="mt-2 text-base leading-6 text-slate-800">
                    每一轮都会显示你的语音文本、AI 回复、它看到的画面依据，以及音乐建议。
                  </p>
                </div>
              ) : null}

              {turns.map((turn, index) => (
                <article key={turn.turnId} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-500">第 {index + 1} 轮</p>
                    <p className="text-xs font-medium uppercase text-slate-500">{formatTurnStatus(turn.status)}</p>
                  </div>

                  <div className="mt-3 rounded-md bg-slate-50 px-3 py-3">
                    <p className="text-xs font-medium uppercase text-slate-500">你说的话</p>
                    <p className="mt-1 text-base text-slate-900">{turn.userText}</p>
                  </div>

                  {turn.status === "submitting" ? (
                    <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                      正在把语音和当前画面发给 Riff 理解。
                    </p>
                  ) : null}

                  {turn.failureReason ? (
                    <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900" role="status">
                      <span className="font-semibold">{turn.failureReason}</span>
                      <span className="ml-2">这一轮没有拿到完整视觉回复，只保留文字兜底。</span>
                    </div>
                  ) : null}

                  {turn.response ? (
                    <div className="mt-3 flex flex-col gap-3">
                      <div className="rounded-md border border-slate-200 bg-white p-3">
                        <p className="text-xs font-medium uppercase text-slate-500">AI 回复</p>
                        <p className="mt-2 text-base leading-6 text-slate-800">{turn.response.replyText}</p>
                        {turn.response.followUpQuestion ? (
                          <p className="mt-2 text-sm font-medium text-signal">{turn.response.followUpQuestion}</p>
                        ) : null}
                      </div>
                      <VisualEvidence observation={turn.response.visualObservation} />
                      <MusicSuggestionCard
                        suggestion={turn.response.musicSuggestion}
                        suggestedActions={turn.response.suggestedActions}
                        onGenerateMusic={() => void startMusicGeneration(turn)}
                        isGenerating={
                          turn.generation?.status === "queued" || turn.generation?.status === "processing"
                        }
                      />
                      <ReferenceTrackPanel generation={turn.generation} />
                      <CloudEvidence qiniu={turn.response.qiniu} />
                      <TtsStatusPanel tts={turn.tts} />
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
