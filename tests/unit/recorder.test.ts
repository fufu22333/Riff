import { describe, expect, it } from "vitest";

import { createVadState, updateVadState } from "@/lib/client/recorder";

describe("voice activity detection state", () => {
  it("enters speaking when volume crosses the threshold", () => {
    const state = updateVadState(createVadState(), { volume: 0.08, elapsedMs: 100 });

    expect(state.status).toBe("speaking");
    expect(state.hasSpeech).toBe(true);
    expect(state.shouldSubmit).toBe(false);
  });

  it("counts silence after speech without submitting before 1500ms", () => {
    const speaking = updateVadState(createVadState(), { volume: 0.08, elapsedMs: 100 });
    const quiet = updateVadState(speaking, { volume: 0.005, elapsedMs: 1000 });

    expect(quiet.status).toBe("silence_countdown");
    expect(quiet.silenceMs).toBe(1000);
    expect(quiet.shouldSubmit).toBe(false);
  });

  it("requests submit after 1500ms of silence following speech", () => {
    const speaking = updateVadState(createVadState(), { volume: 0.08, elapsedMs: 100 });
    const quiet = updateVadState(speaking, { volume: 0.005, elapsedMs: 1500 });

    expect(quiet.status).toBe("submitted");
    expect(quiet.shouldSubmit).toBe(true);
  });

  it("does not submit if silence happens before any speech", () => {
    const quiet = updateVadState(createVadState(), { volume: 0.005, elapsedMs: 2000 });

    expect(quiet.status).toBe("idle");
    expect(quiet.hasSpeech).toBe(false);
    expect(quiet.shouldSubmit).toBe(false);
  });
});
