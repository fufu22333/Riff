"use client";

import { Camera, CameraOff, ImagePlus, Power, Send } from "lucide-react";
import Image from "next/image";
import React from "react";
import { useEffect, useRef, useState } from "react";

import type { FailureCode } from "@/lib/contracts/failures";
import { captureVideoSnapshot, type SnapshotPayload } from "@/lib/client/camera";

type CameraStatus = "idle" | "requesting" | "ready" | "failed";

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export function CameraPreview() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [failureReason, setFailureReason] = useState<FailureCode | null>(null);
  const [snapshot, setSnapshot] = useState<SnapshotPayload | null>(null);
  const [snapshotSent, setSnapshotSent] = useState(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    return () => stopStream(stream);
  }, [stream]);

  async function startCamera() {
    setStatus("requesting");
    setFailureReason(null);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new DOMException("Camera API unavailable", "NotAllowedError");
      }

      const nextStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        },
        audio: false
      });

      stopStream(stream);
      setStream(nextStream);
      setStatus("ready");
    } catch {
      setStream(null);
      setStatus("failed");
      setFailureReason("no_camera_permission");
    }
  }

  function stopCamera() {
    stopStream(stream);
    setStream(null);
    setStatus("idle");
  }

  function captureSnapshot() {
    if (!videoRef.current) {
      setFailureReason("snapshot_failed");
      return;
    }

    try {
      const nextSnapshot = captureVideoSnapshot(videoRef.current);
      setSnapshot(nextSnapshot);
      setSnapshotSent(true);
      setFailureReason(null);
    } catch {
      setFailureReason("snapshot_failed");
      setSnapshotSent(false);
    }
  }

  const previewLabel =
    status === "ready" ? "Live camera preview" : status === "requesting" ? "Requesting camera" : "Camera is off";

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="relative flex min-h-[300px] flex-1 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-950">
        {status === "ready" ? (
          <video
            ref={videoRef}
            aria-label="Live camera preview"
            className="h-full min-h-[300px] w-full object-cover"
            autoPlay
            muted
            playsInline
          />
        ) : (
          <div className="px-6 text-center text-white">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-white">
              {status === "failed" ? (
                <CameraOff className="h-7 w-7" aria-hidden="true" />
              ) : (
                <Camera className="h-7 w-7" aria-hidden="true" />
              )}
            </div>
            <p className="mt-4 text-base font-semibold">{previewLabel}</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Start the camera to give Riff a live visual scene. If permission is blocked, Riff stays in voice-only
              mode.
            </p>
          </div>
        )}
      </div>

      {failureReason ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-900" role="status">
          <span className="font-semibold">{failureReason}</span>
          <span className="ml-2">
            {failureReason === "no_camera_permission"
              ? "Camera access is unavailable; continuing in voice-only mode."
              : "Snapshot capture failed; text conversation can continue."}
          </span>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={startCamera}
          disabled={status === "requesting" || status === "ready"}
          className="inline-flex items-center gap-2 rounded-md bg-signal px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <Camera className="h-4 w-4" aria-hidden="true" />
          {status === "requesting" ? "Requesting" : "Start camera"}
        </button>
        <button
          type="button"
          onClick={captureSnapshot}
          disabled={status !== "ready"}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          <ImagePlus className="h-4 w-4" aria-hidden="true" />
          Capture snapshot
        </button>
        <button
          type="button"
          onClick={stopCamera}
          disabled={status !== "ready"}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          <Power className="h-4 w-4" aria-hidden="true" />
          Stop camera
        </button>
      </div>

      {snapshot ? (
        <div className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[140px_1fr]">
          <Image
            src={`data:${snapshot.mimeType};base64,${snapshot.base64}`}
            alt="Latest compressed snapshot"
            width={140}
            height={96}
            unoptimized
            className="h-24 w-full rounded object-cover"
          />
          <div className="flex flex-col justify-center text-sm text-slate-700">
            <p className="font-semibold text-slate-900">
              Snapshot ready · {snapshot.width}×{snapshot.height} · {snapshot.mimeType}
            </p>
            {snapshotSent ? (
              <p className="mt-2 inline-flex items-center gap-2 text-signal">
                <Send className="h-4 w-4" aria-hidden="true" />
                Sent to AI observation
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
