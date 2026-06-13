export type VadStatus = "idle" | "speaking" | "silence_countdown" | "submitted";

export type VadState = {
  status: VadStatus;
  hasSpeech: boolean;
  silenceMs: number;
  shouldSubmit: boolean;
  threshold: number;
  silenceLimitMs: number;
};

export type VadSample = {
  volume: number;
  elapsedMs: number;
};

export function createVadState(options: { threshold?: number; silenceLimitMs?: number } = {}): VadState {
  return {
    status: "idle",
    hasSpeech: false,
    silenceMs: 0,
    shouldSubmit: false,
    threshold: options.threshold ?? 0.035,
    silenceLimitMs: options.silenceLimitMs ?? 1500
  };
}

export function updateVadState(state: VadState, sample: VadSample): VadState {
  if (state.status === "submitted") {
    return state;
  }

  if (sample.volume >= state.threshold) {
    return {
      ...state,
      status: "speaking",
      hasSpeech: true,
      silenceMs: 0,
      shouldSubmit: false
    };
  }

  if (!state.hasSpeech) {
    return {
      ...state,
      status: "idle",
      silenceMs: 0,
      shouldSubmit: false
    };
  }

  const silenceMs = state.silenceMs + sample.elapsedMs;

  if (silenceMs >= state.silenceLimitMs) {
    return {
      ...state,
      status: "submitted",
      silenceMs,
      shouldSubmit: true
    };
  }

  return {
    ...state,
    status: "silence_countdown",
    silenceMs,
    shouldSubmit: false
  };
}

export function calculateRmsVolume(samples: Float32Array) {
  if (samples.length === 0) {
    return 0;
  }

  let sum = 0;

  for (const sample of samples) {
    sum += sample * sample;
  }

  return Math.sqrt(sum / samples.length);
}
