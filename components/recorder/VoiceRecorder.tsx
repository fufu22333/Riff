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

function encodeWav(samples: Float32Array[], sampleRate: number) {
  const sampleCount = samples.reduce((total, chunk) => total + chunk.length, 0);
  const dataSize = sampleCount * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeString(offset: number, value: string) {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (const chunk of samples) {
    for (let index = 0; index < chunk.length; index += 1) {
      const sample = Math.max(-1, Math.min(1, chunk[index]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: "audio/wav" });
}

async function submitAudioToAsr(audio: Blob, filename = "turn.webm"): Promise<AsrSuccess> {
  const formData = new FormData();
  formData.set("audio", audio, filename);

  const response = await fetch("/api/asr", {
    method: "POST",
    body: formData
  });
  const body = (await response.json()) as AsrSuccess | AsrFailure;

  if (!response.ok || "failureReason" in body) {
    throw new Error("message" in body ? body.message : "ASR failed");
  }

  return body;
}

async function createDefaultTestAudioBlob() {
  const response = await fetch("/audio/test-asr.wav");

  if (!response.ok) {
    throw new Error("Test ASR audio sample is unavailable");
  }

  return response.blob();
}

function formatRecorderStatus(status: RecorderStatus) {
  const labels: Record<RecorderStatus, string> = {
    idle: "空闲",
    requesting: "请求麦克风中",
    recording: "录音中",
    submitting: "识别中",
    transcribed: "已识别",
    failed: "失败"
  };

  return labels[status];
}

function formatVadStatus(status: VadState["status"]) {
  const labels: Record<VadState["status"], string> = {
    idle: "空闲",
    speaking: "检测到说话",
    silence_countdown: "等待说完",
    submitted: "已提交"
  };

  return labels[status];
}

export function VoiceRecorder({ onTranscript, createTestAudioBlob }: VoiceRecorderProps) {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [vadStatus, setVadStatus] = useState<VadState["status"]>("idle");
  const [userText, setUserText] = useState("");
  const [failureReason, setFailureReason] = useState<"asr_failed" | null>(null);
  const [failureMessage, setFailureMessage] = useState("");
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const sampleRateRef = useRef(44_100);
  const vadStateRef = useRef(createVadState());
  const lastTickRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const submittedRef = useRef(false);

  function stopStream() {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    processorRef.current?.disconnect();
    processorRef.current = null;
    sourceRef.current?.disconnect();
    sourceRef.current = null;

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }

  async function handleAsr(audio: Blob, filename?: string) {
    setStatus("submitting");
    setFailureReason(null);
    setFailureMessage("");

    try {
      const result = await submitAudioToAsr(audio, filename);
      setUserText(result.userText);
      setStatus("transcribed");
      onTranscript(result.userText);
    } catch (error) {
      setStatus("failed");
      setFailureReason("asr_failed");
      setFailureMessage(error instanceof Error ? error.message : "语音识别失败，请再试一次。");
    }
  }

  function submitRecordedAudio() {
    if (submittedRef.current) {
      return;
    }

    submittedRef.current = true;

    if (audioContextRef.current) {
      const audio = encodeWav(pcmChunksRef.current, sampleRateRef.current);
      stopStream();
      void handleAsr(audio, "turn.wav");
      return;
    }

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
    setFailureMessage("");
    setUserText("");
    pcmChunksRef.current = [];
    vadStateRef.current = createVadState();
    submittedRef.current = false;
    setVadStatus("idle");

    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof AudioContext === "undefined") {
        throw new Error("Recording APIs are unavailable");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      sampleRateRef.current = audioContext.sampleRate;
      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;
      const analyser = audioContext.createAnalyser();
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      analyser.fftSize = 1024;
      source.connect(analyser);
      source.connect(processor);
      processor.connect(audioContext.destination);
      processor.onaudioprocess = (event) => {
        if (submittedRef.current) {
          return;
        }

        pcmChunksRef.current.push(new Float32Array(event.inputBuffer.getChannelData(0)));
      };
      setStatus("recording");
      watchVad(analyser);
    } catch {
      stopStream();
      setStatus("failed");
      setFailureReason("asr_failed");
      setFailureMessage("无法打开麦克风，请检查浏览器权限。");
    }
  }

  function stopRecording() {
    submitRecordedAudio();
  }

  async function testAsr() {
    if (createTestAudioBlob) {
      await handleAsr(createTestAudioBlob());
      return;
    }

    const audio = await createDefaultTestAudioBlob();
    await handleAsr(audio, "test-asr.wav");
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">麦克风 / 语音检测</p>
          <p className="mt-1 text-base font-semibold text-slate-900">
            {status === "requesting"
              ? "正在请求麦克风"
              : status === "recording"
                ? "正在听你说话"
                : status === "submitting"
                  ? "正在识别语音"
                  : "可以开始说话"}
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
            开始说话
          </button>
          <button
            type="button"
            onClick={stopRecording}
            disabled={status !== "recording"}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            <MicOff className="h-4 w-4" aria-hidden="true" />
            停止
          </button>
          <button
            type="button"
            onClick={testAsr}
            disabled={status === "requesting" || status === "recording" || status === "submitting"}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            <TestTube2 className="h-4 w-4" aria-hidden="true" />
            测试识别
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
        <p>
          语音检测：<span className="font-semibold">{formatVadStatus(vadStatus)}</span>
        </p>
        <p>
          语音识别：<span className="font-semibold">{formatRecorderStatus(status)}</span>
        </p>
      </div>

      {userText ? (
        <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
          <span className="font-semibold">识别文本</span>
          <span className="ml-2">{userText}</span>
        </div>
      ) : null}

      {failureReason ? (
        <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-900" role="status">
          <span className="font-semibold">{failureReason}</span>
          <span className="ml-2">{failureMessage || "语音识别失败，请再说一次。"}</span>
          <button
            type="button"
            onClick={() => {
              setFailureReason(null);
              setStatus("idle");
            }}
            className="ml-3 inline-flex items-center gap-1 font-semibold text-rose-950"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            重新说
          </button>
        </div>
      ) : null}
    </div>
  );
}
