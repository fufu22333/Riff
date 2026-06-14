"use client";

import { Camera, CameraOff, ImagePlus, Power, Send } from "lucide-react";
import Image from "next/image";
import React from "react";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

import type { FailureCode } from "@/lib/contracts/failures";
import { captureVideoSnapshot, type SnapshotPayload } from "@/lib/client/camera";

type CameraStatus = "idle" | "requesting" | "ready" | "failed";

const copy = {
  ready: "\u6444\u50cf\u5934\u753b\u9762\u5df2\u5f00\u542f",
  requesting: "\u6b63\u5728\u8bf7\u6c42\u6444\u50cf\u5934",
  off: "\u6444\u50cf\u5934\u672a\u5f00\u542f",
  liveLabel: "\u5b9e\u65f6\u6444\u50cf\u5934\u753b\u9762",
  intro: "\u5f00\u542f\u6444\u50cf\u5934\u540e\uff0cRiff \u4f1a\u628a\u5f53\u524d\u753b\u9762\u548c\u4f60\u8bf4\u7684\u8bdd\u4e00\u8d77\u7406\u89e3\u3002\u6743\u9650\u88ab\u62d2\u7edd\u65f6\uff0c\u4e5f\u53ef\u4ee5\u7ee7\u7eed\u7eaf\u8bed\u97f3\u804a\u5929\u3002",
  cameraDenied: "\u65e0\u6cd5\u8bbf\u95ee\u6444\u50cf\u5934\uff1b\u53ef\u4ee5\u7ee7\u7eed\u7eaf\u8bed\u97f3\u6a21\u5f0f\u3002",
  snapshotFailed: "\u622a\u56fe\u5931\u8d25\uff1b\u6587\u5b57\u548c\u8bed\u97f3\u5bf9\u8bdd\u4ecd\u53ef\u7ee7\u7eed\u3002",
  requestingButton: "\u8bf7\u6c42\u4e2d",
  start: "\u5f00\u542f\u6444\u50cf\u5934",
  capture: "\u622a\u53d6\u5f53\u524d\u753b\u9762",
  stop: "\u5173\u95ed\u6444\u50cf\u5934",
  latestAlt: "\u6700\u8fd1\u4e00\u6b21\u622a\u56fe",
  snapshotReady: "\u622a\u56fe\u5df2\u51c6\u5907\u597d",
  sent: "\u5df2\u53d1\u9001\u7ed9 AI \u89c2\u5bdf"
};

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export type CameraPreviewProps = {
  onSnapshot?: (snapshot: SnapshotPayload) => void;
};

export type CameraPreviewHandle = {
  captureSnapshot: () => SnapshotPayload | null;
};

export const CameraPreview = forwardRef<CameraPreviewHandle, CameraPreviewProps>(function CameraPreview(
  { onSnapshot },
  ref
) {
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

  const captureSnapshot = useCallback(() => {
    if (status !== "ready") {
      return null;
    }

    if (!videoRef.current) {
      setFailureReason("snapshot_failed");
      return null;
    }

    try {
      const nextSnapshot = captureVideoSnapshot(videoRef.current);
      setSnapshot(nextSnapshot);
      setSnapshotSent(true);
      setFailureReason(null);
      onSnapshot?.(nextSnapshot);
      return nextSnapshot;
    } catch {
      setFailureReason("snapshot_failed");
      setSnapshotSent(false);
      return null;
    }
  }, [onSnapshot, status]);

  useImperativeHandle(ref, () => ({ captureSnapshot }), [captureSnapshot]);

  const previewLabel = status === "ready" ? copy.ready : status === "requesting" ? copy.requesting : copy.off;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="relative flex min-h-[300px] flex-1 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-950">
        {status === "ready" ? (
          <video
            ref={videoRef}
            aria-label={copy.liveLabel}
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
            <p className="mt-2 text-sm leading-6 text-slate-300">{copy.intro}</p>
          </div>
        )}
      </div>

      {failureReason ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-900" role="status">
          <span className="font-semibold">{failureReason}</span>
          <span className="ml-2">
            {failureReason === "no_camera_permission" ? copy.cameraDenied : copy.snapshotFailed}
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
          {status === "requesting" ? copy.requestingButton : copy.start}
        </button>
        <button
          type="button"
          onClick={captureSnapshot}
          disabled={status !== "ready"}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          <ImagePlus className="h-4 w-4" aria-hidden="true" />
          {copy.capture}
        </button>
        <button
          type="button"
          onClick={stopCamera}
          disabled={status !== "ready"}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          <Power className="h-4 w-4" aria-hidden="true" />
          {copy.stop}
        </button>
      </div>

      {snapshot ? (
        <div className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[140px_1fr]">
          <Image
            src={`data:${snapshot.mimeType};base64,${snapshot.base64}`}
            alt={copy.latestAlt}
            width={140}
            height={96}
            unoptimized
            className="h-24 w-full rounded object-cover"
          />
          <div className="flex flex-col justify-center text-sm text-slate-700">
            <p className="font-semibold text-slate-900">
              {copy.snapshotReady} - {snapshot.width}x{snapshot.height} - {snapshot.mimeType}
            </p>
            {snapshotSent ? (
              <p className="mt-2 inline-flex items-center gap-2 text-signal">
                <Send className="h-4 w-4" aria-hidden="true" />
                {copy.sent}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
});
