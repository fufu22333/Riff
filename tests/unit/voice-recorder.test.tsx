import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { VoiceRecorder } from "@/components/recorder/VoiceRecorder";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function render(ui: React.ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  act(() => {
    root?.render(ui);
  });

  return container;
}

function clickByText(text: string) {
  const button = Array.from(document.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );

  if (!button) {
    throw new Error(`Button with text "${text}" was not found`);
  }

  act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  container?.remove();
  container = null;
  root = null;
  vi.restoreAllMocks();
});

describe("VoiceRecorder", () => {
  it("submits a test audio blob and displays returned userText", async () => {
    const onTranscript = vi.fn();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ userText: "Make it feel like midnight rain", provider: "fake" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    const view = render(
      <VoiceRecorder
        onTranscript={onTranscript}
        createTestAudioBlob={() => new Blob(["audio"], { type: "audio/webm" })}
      />
    );

    clickByText("Test ASR");

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(view.textContent).toContain("Make it feel like midnight rain");
    expect(onTranscript).toHaveBeenCalledWith("Make it feel like midnight rain");
  });

  it("shows asr_failed when ASR returns a failure", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ failureReason: "asr_failed", message: "ASR provider failed" }), {
        status: 502,
        headers: { "content-type": "application/json" }
      })
    );

    const view = render(
      <VoiceRecorder
        onTranscript={() => undefined}
        createTestAudioBlob={() => new Blob(["audio"], { type: "audio/webm" })}
      />
    );

    clickByText("Test ASR");

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(view.textContent).toContain("asr_failed");
    expect(view.textContent).toContain("Record again");
  });

  it("stops microphone tracks and closes the audio context when recording stops", async () => {
    const trackStop = vi.fn();
    const audioContextClose = vi.fn();

    class MockMediaRecorder {
      mimeType = "audio/webm";
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;

      constructor(public stream: MediaStream) {}

      start() {}

      stop() {
        this.ondataavailable?.({ data: new Blob(["recorded audio"], { type: "audio/webm" }) });
        this.onstop?.();
      }
    }

    class MockAudioContext {
      createMediaStreamSource() {
        return { connect: vi.fn() };
      }

      createAnalyser() {
        return {
          fftSize: 1024,
          getFloatTimeDomainData: vi.fn()
        };
      }

      close = audioContextClose;
    }

    vi.stubGlobal("MediaRecorder", MockMediaRecorder);
    vi.stubGlobal("AudioContext", MockAudioContext);
    vi.spyOn(globalThis, "requestAnimationFrame").mockReturnValue(1);
    vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(() => undefined);
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: trackStop }]
        })
      }
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ userText: "Keep the drums loose", provider: "fake" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    render(<VoiceRecorder onTranscript={() => undefined} />);

    clickByText("Start voice");

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    clickByText("Stop voice");

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(trackStop).toHaveBeenCalledTimes(1);
    expect(audioContextClose).toHaveBeenCalledTimes(1);
  });
});
