import { readFile } from "node:fs/promises";
import path from "node:path";

export const fallbackSampleAudioContentType = "audio/wav";
export const fallbackSampleAudioPath = path.join(process.cwd(), "public", "audio", "fallback-sample.wav");

function hasAudiblePcmData(audio: Uint8Array) {
  for (let offset = 44; offset + 1 < audio.byteLength; offset += 2) {
    if ((audio[offset] ?? 0) !== 0 || (audio[offset + 1] ?? 0) !== 0) {
      return true;
    }
  }

  return false;
}

export async function readFallbackSampleAudio() {
  const audio = await readFile(fallbackSampleAudioPath);

  if (
    audio.byteLength <= 44 ||
    audio.toString("ascii", 0, 4) !== "RIFF" ||
    audio.toString("ascii", 8, 12) !== "WAVE" ||
    audio.toString("ascii", 36, 40) !== "data" ||
    !hasAudiblePcmData(audio)
  ) {
    throw new Error("Fallback sample audio is not a playable audible WAV");
  }

  return audio;
}
