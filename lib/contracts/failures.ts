export const failureCodes = [
  "no_camera_permission",
  "snapshot_failed",
  "snapshot_blurry",
  "too_dark",
  "no_visual_subject",
  "vision_api_failed",
  "asr_failed",
  "tts_failed",
  "music_generation_failed"
] as const;

export type FailureCode = (typeof failureCodes)[number];

const failureCodeSet = new Set<string>(failureCodes);

export function isFailureCode(value: string): value is FailureCode {
  return failureCodeSet.has(value);
}
