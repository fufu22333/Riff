"use client";

import { Mic, MicOff, RotateCcw, TestTube2 } from "lucide-react";
import React, { useRef, useState } from "react";

import type { AsrFailure, AsrSuccess } from "@/lib/contracts/asr";
import { calculateRmsVolume, createVadState, updateVadState, type VadState } from "@/lib/client/recorder";

type RecorderStatus = "idle" | "requesting" | "recording" | "submitting" | "transcribed" | "failed";

export type VoiceRecorderProps = {
  onTranscript: (userText: string) => void;
  createTestAudioBlob?: () => Blob;
};

async function submitAudioToAsr(audio: Blob): Promise<AsrSuccess> {
  const formData = new FormData();
  formData.set("audio", audio, "turn.webm");

  const response = await fetch("/api/asr", {
    method: "POST",
    body: formData
  });
  const body = (await response.json()) as AsrSuccess | AsrFailure;

  if (!response.ok || "failureReason" in body) {
    throw new Error("ASR failed");
  }

  return body;
}

export function VoiceRecorder({ onTranscript, createTestAudioBlob }: VoiceRecorderProps) {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [vadStatus, setVadStatus] = useState<VadState["status"]>("idle");
  const [userText, setUserText] = useState("");
  const [failureReason, setFailureReason] = useState<"asr_failed" | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const vadStateRef = useRef(createVadState());
  const lastTickRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const submittedRef = useRef(false);

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }

  async function handleAsr(audio: Blob) {
    setStatus("submitting");
    setFailureReason(null);

    try {
      const result = await submitAudioToAsr(audio);
      setUserText(result.userText);
      setStatus("transcribed");
      onTranscript(result.userText);
    } catch {
      setStatus("failed");
      setFailureReason("asr_failed");
    }
  }

  function submitRecordedAudio() {
    if (submittedRef.current) {
      return;
    }

    submittedRef.current = true;
    mediaRecorderRef.current?.stop();
  }

  function watchVad(analyser: AnalyserNode) {
    const samples = new Float32Array(analyser.fftSize);

    function tick(now: number) {
      analyser.getFloatTimeDomainData(samples);
      const elapsedMs = lastTickRef.current === 0 ? 100 : Math.max(16, now - lastTickRef.current);
      lastTickRef.current = now;
      vadStateRef.current = updateVadState(vadStateRef.current, {
        volume: calculateRmsVolume(samples),
        elapsedMs
      });
      setVadStatus(vadStateRef.current.status);

      if (vadStateRef.current.shouldSubmit) {
        submitRecordedAudio();
        return;
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    }

    animationFrameRef.current = requestAnimationFrame(tick);
  }

  async function startRecording() {
    setStatus("requesting");
    setFailureReason(null);
    setUserText("");
    chunksRef.current = [];
    vadStateRef.current = createVadState();
    submittedRef.current = false;
    setVadStatus("idle");

    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        throw new Error("Recording APIs are unavailable");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        stopStream();
        const audio = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        void handleAsr(audio);
      };

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      recorder.start();
      setStatus("recording");
      watchVad(analyser);
    } catch {
      stopStream();
      setStatus("failed");
      setFailureReason("asr_failed");
    }
  }

  function stopRecording() {
    submitRecordedAudio();
  }

  async function testAsr() {
    await handleAsr(createTestAudioBlob?.() ?? new Blob(["fake audio"], { type: "audio/webm" }));
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Mic / VAD</p>
          <p className="mt-1 text-base font-semibold text-slate-900">
            {status === "requesting"
              ? "Preparing microphone"
              : status === "recording"
                ? "Listening"
                : status === "submitting"
                  ? "Transcribing"
                  : "Ready for voice"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={startRecording}
            disabled={status === "requesting" || status === "recording" || status === "submitting"}
            className="inline-flex items-center gap-2 rounded-md bg-signal px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Mic className="h-4 w-4" aria-hidden="true" />
            Start voice
          </button>
          <button
            type="button"
            onClick={stopRecording}
            disabled={status !== "recording"}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            <MicOff className="h-4 w-4" aria-hidden="true" />
            Stop voice
          </button>
          <button
            type="button"
            onClick={testAsr}
            disabled={status === "requesting" || status === "recording" || status === "submitting"}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            <TestTube2 className="h-4 w-4" aria-hidden="true" />
            Test ASR
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
        <p>
          VAD state: <span className="font-semibold">{vadStatus}</span>
        </p>
        <p>
          ASR state: <span className="font-semibold">{status}</span>
        </p>
      </div>

      {userText ? (
        <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
          <span className="font-semibold">userText</span>
          <span className="ml-2">{userText}</span>
        </div>
      ) : null}

      {failureReason ? (
        <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-900" role="status">
          <span className="font-semibold">{failureReason}</span>
          <span className="ml-2">Record again when you are ready.</span>
          <button
            type="button"
            onClick={() => {
              setFailureReason(null);
              setStatus("idle");
            }}
            className="ml-3 inline-flex items-center gap-1 font-semibold text-rose-950"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Record again
          </button>
        </div>
      ) : null}
    </div>
  );
}
