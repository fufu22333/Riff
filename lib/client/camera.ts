import type { z } from "zod";

import { snapshotSchema } from "@/lib/contracts/chat";

export type SnapshotPayload = z.infer<typeof snapshotSchema>;

const DEFAULT_MAX_WIDTH = 768;
const SNAPSHOT_QUALITY = 0.82;

export function calculateSnapshotSize(videoWidth: number, videoHeight: number, maxWidth = DEFAULT_MAX_WIDTH) {
  if (videoWidth <= 0 || videoHeight <= 0) {
    throw new Error("Video dimensions must be positive before capturing a snapshot");
  }

  if (videoWidth <= maxWidth) {
    return { width: Math.round(videoWidth), height: Math.round(videoHeight) };
  }

  const scale = maxWidth / videoWidth;

  return {
    width: maxWidth,
    height: Math.round(videoHeight * scale)
  };
}

export function chooseSnapshotMimeType(canvas: HTMLCanvasElement): SnapshotPayload["mimeType"] {
  const webpPreview = canvas.toDataURL("image/webp", SNAPSHOT_QUALITY);

  if (webpPreview.startsWith("data:image/webp")) {
    return "image/webp";
  }

  const jpegPreview = canvas.toDataURL("image/jpeg", SNAPSHOT_QUALITY);

  if (jpegPreview.startsWith("data:image/jpeg")) {
    return "image/jpeg";
  }

  return "image/png";
}

export function captureVideoSnapshot(video: HTMLVideoElement): SnapshotPayload {
  const sourceWidth = video.videoWidth || video.clientWidth;
  const sourceHeight = video.videoHeight || video.clientHeight;
  const { width, height } = calculateSnapshotSize(sourceWidth, sourceHeight);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas 2D context is unavailable");
  }

  context.drawImage(video, 0, 0, width, height);

  const mimeType = chooseSnapshotMimeType(canvas);
  const dataUrl = canvas.toDataURL(mimeType, SNAPSHOT_QUALITY);
  const [, base64 = ""] = dataUrl.split(",");

  if (!base64) {
    throw new Error("Snapshot encoding returned an empty payload");
  }

  return {
    mimeType,
    base64,
    width,
    height
  };
}
