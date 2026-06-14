import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import Home from "@/app/page";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function renderHome() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  act(() => {
    root?.render(<Home />);
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

function expectNoExportActions() {
  const interactiveLabels = Array.from(document.querySelectorAll("button, a"))
    .map((candidate) => candidate.textContent ?? "")
    .join(" ");

  expect(interactiveLabels).not.toMatch(/download|export|copy link/i);
}

function createFallbackTtsResponse() {
  return new Response(
    JSON.stringify({
      status: "fallback",
      ttsJobId: "tts-fallback",
      ttsUrl: null,
      errorCode: null
    }),
    {
      status: 200,
      headers: { "content-type": "application/json" }
    }
  );
}

function createTestAsrAudioResponse() {
  return new Response("RIFF test wav", {
    status: 200,
    headers: { "content-type": "audio/wav" }
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

describe("home chat flow", () => {
  it("creates a reference track job from a suggested action and renders the playable result", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      if (input === "/audio/test-asr.wav") {
        return createTestAsrAudioResponse();
      }

      if (input === "/api/asr") {
        return new Response(JSON.stringify({ userText: "Generate a short midnight rain reference", provider: "fake" }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }

      if (input === "/api/chat") {
        return new Response(
          JSON.stringify({
            sessionId: "session-1",
            turnId: "turn-1",
            replyText: "That can become a sparse late-night reference cue.",
            visualObservation: {
              isUsable: false,
              summary: null,
              objects: [],
              sceneMood: null,
              motionEnergy: null,
              confidence: 0,
              failureReason: "no_visual_subject"
            },
            musicSuggestion: {
              mood: "midnight rain",
              tempo: "74 BPM",
              instruments: ["felt piano", "soft pad"],
              structure: "quiet intro -> pulse",
              promptForMusicGen: "midnight rain sparse felt piano"
            },
            followUpQuestion: "Want a reference clip?",
            suggestedActions: ["generate_music"]
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" }
          }
        );
      }

      if (input === "/api/tts") {
        return createFallbackTtsResponse();
      }

      if (input === "/api/generate") {
        return new Response(
          JSON.stringify({
            status: "queued",
            jobId: "music-job-1",
            musicUrl: null,
            errorCode: null,
            usage: "reference_only",
            isExportable: false
          }),
          {
            status: 202,
            headers: { "content-type": "application/json" }
          }
        );
      }

      if (input === "/api/generate/music-job-1") {
        return new Response(
          JSON.stringify({
            status: "ready",
            jobId: "music-job-1",
            musicUrl: "https://cdn.example.com/audio/session-1/music-job-1.wav",
            errorCode: null,
            usage: "reference_only",
            isExportable: false
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" }
          }
        );
      }

      throw new Error(`Unexpected fetch: ${String(input)}`);
    });

    const view = renderHome();

    clickByText("测试识别");
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    clickByText("生成音乐");
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/generate",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("midnight rain sparse felt piano")
      })
    );
    expect(view.textContent).toContain("参考音频");
    expect(view.textContent).toContain("ready");
    expect(view.textContent).toContain("仅供参考");
    expect(view.textContent).toContain("当前不是完整可商用生成，只是本地/兜底参考音频");
    expectNoExportActions();
    expect(view.querySelector("audio")?.getAttribute("src")).toBe(
      "https://cdn.example.com/audio/session-1/music-job-1.wav"
    );
    expect(view.querySelector("audio")?.getAttribute("controlsList")).toBe("nodownload");
  });

  it("renders fallback-ready reference tracks as non-exportable playable audio", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      if (input === "/audio/test-asr.wav") {
        return createTestAsrAudioResponse();
      }

      if (input === "/api/asr") {
        return new Response(JSON.stringify({ userText: "Generate a fallback reference", provider: "fake" }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }

      if (input === "/api/chat") {
        return new Response(
          JSON.stringify({
            sessionId: "session-1",
            turnId: "turn-1",
            replyText: "A fallback reference sample can still demonstrate the direction.",
            visualObservation: {
              isUsable: false,
              summary: null,
              objects: [],
              sceneMood: null,
              motionEnergy: null,
              confidence: 0,
              failureReason: "no_visual_subject"
            },
            musicSuggestion: {
              mood: "midnight rain",
              tempo: "74 BPM",
              instruments: ["felt piano", "soft pad"],
              structure: "quiet intro -> pulse",
              promptForMusicGen: "midnight rain sparse felt piano"
            },
            followUpQuestion: "Want a fallback reference clip?",
            suggestedActions: ["generate_music"]
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" }
          }
        );
      }

      if (input === "/api/tts") {
        return createFallbackTtsResponse();
      }

      if (input === "/api/generate") {
        return new Response(
          JSON.stringify({
            status: "fallback_ready",
            jobId: "music-job-fallback",
            musicUrl: "https://cdn.example.com/audio/session-1/music-job-fallback.wav",
            errorCode: "music_generation_failed",
            usage: "reference_only",
            isExportable: false
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" }
          }
        );
      }

      throw new Error(`Unexpected fetch: ${String(input)}`);
    });

    const view = renderHome();

    clickByText("测试识别");
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    clickByText("生成音乐");
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(view.textContent).toContain("fallback_ready");
    expect(view.textContent).toContain("仅供参考");
    expect(view.textContent).toContain("当前不是完整可商用生成，只是本地/兜底参考音频");
    expectNoExportActions();
    expect(view.querySelector("audio")?.getAttribute("src")).toBe(
      "https://cdn.example.com/audio/session-1/music-job-fallback.wav"
    );
    expect(view.querySelector("audio")?.getAttribute("controlsList")).toBe("nodownload");
  });

  it("shows the chat reply before surfacing async TTS failure state", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      if (input === "/audio/test-asr.wav") {
        return createTestAsrAudioResponse();
      }

      if (input === "/api/asr") {
        return new Response(JSON.stringify({ userText: "Make it feel like midnight rain", provider: "fake" }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }

      if (input === "/api/chat") {
        return new Response(
          JSON.stringify({
            sessionId: "session-1",
            turnId: "turn-1",
            replyText: "The text reply should remain visible while TTS fails later.",
            visualObservation: {
              isUsable: false,
              summary: null,
              objects: [],
              sceneMood: null,
              motionEnergy: null,
              confidence: 0,
              failureReason: "no_visual_subject"
            },
            musicSuggestion: {
              mood: "midnight rain",
              tempo: "74 BPM",
              instruments: ["felt piano", "soft pad"],
              structure: "quiet intro -> pulse",
              promptForMusicGen: "midnight rain sparse felt piano"
            },
            followUpQuestion: null,
            suggestedActions: []
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" }
          }
        );
      }

      if (input === "/api/tts") {
        return new Response(
          JSON.stringify({
            status: "pending",
            ttsJobId: "tts-job-1",
            ttsUrl: null,
            errorCode: null
          }),
          {
            status: 202,
            headers: { "content-type": "application/json" }
          }
        );
      }

      if (input === "/api/tts/tts-job-1") {
        return new Response(
          JSON.stringify({
            status: "failed",
            ttsJobId: "tts-job-1",
            ttsUrl: null,
            errorCode: "tts_failed"
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" }
          }
        );
      }

      throw new Error(`Unexpected fetch: ${String(input)}`);
    });

    const view = renderHome();

    clickByText("测试识别");
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(view.textContent).toContain("The text reply should remain visible while TTS fails later.");
    expect(view.textContent).toContain("TTS");
    expect(view.textContent).toContain("failed");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/tts",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("The text reply should remain visible while TTS fails later.")
      })
    );
  });

  it("submits ASR userText to /api/chat and renders the structured response", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      if (input === "/audio/test-asr.wav") {
        return createTestAsrAudioResponse();
      }

      if (input === "/api/asr") {
        return new Response(JSON.stringify({ userText: "Make it feel like midnight rain", provider: "fake" }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }

      if (input === "/api/chat") {
        return new Response(
          JSON.stringify({
            sessionId: "session-1",
            turnId: "turn-1",
            replyText: "The voice-only scene can become a sparse midnight rain cue.",
            visualObservation: {
              isUsable: false,
              summary: null,
              objects: [],
              sceneMood: null,
              motionEnergy: null,
              confidence: 0,
              failureReason: "no_visual_subject"
            },
            musicSuggestion: {
              mood: "midnight rain",
              tempo: "74 BPM",
              instruments: ["felt piano", "soft pad"],
              structure: "quiet intro -> pulse",
              promptForMusicGen: "midnight rain sparse felt piano"
            },
            followUpQuestion: "Can you show the lyric sheet?",
            suggestedActions: ["generate_music"],
            qiniu: {
              snapshotUrl: "https://cdn.example.com/snapshots/session-1/turn-1.webp",
              turnJsonUrl: "https://cdn.example.com/turns/session-1/turn-1.json"
            }
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" }
          }
        );
      }

      throw new Error(`Unexpected fetch: ${String(input)}`);
    });

    const view = renderHome();

    clickByText("测试识别");

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/chat",
      expect.objectContaining({
        method: "POST",
        headers: { "content-type": "application/json" },
        body: expect.any(String)
      })
    );
    const chatBody = JSON.parse(fetchMock.mock.calls.find((call) => call[0] === "/api/chat")?.[1]?.body as string);
    expect(chatBody.userText).toBe("Make it feel like midnight rain");
    expect(chatBody.sessionId).toMatch(/^session-/);
    expect(chatBody.turnId).toEqual(expect.any(String));
    expect(view.textContent).toContain("The voice-only scene can become a sparse midnight rain cue.");
    expect(view.textContent).toContain("no_visual_subject");
    expect(view.textContent).toContain("midnight rain");
    expect(view.textContent).toContain("云端记录");
    expect(view.textContent).toContain("https://cdn.example.com/snapshots/session-1/turn-1.webp");
    expect(view.textContent).toContain("https://cdn.example.com/turns/session-1/turn-1.json");
  });

  it("captures a fresh camera snapshot before submitting the chat turn", async () => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }]
        })
      }
    });
    Object.defineProperty(HTMLVideoElement.prototype, "videoWidth", { configurable: true, value: 640 });
    Object.defineProperty(HTMLVideoElement.prototype, "videoHeight", { configurable: true, value: 360 });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: vi.fn()
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/webp;base64,fresh-frame");

    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      if (input === "/audio/test-asr.wav") {
        return createTestAsrAudioResponse();
      }

      if (input === "/api/asr") {
        return new Response(JSON.stringify({ userText: "Use what you can see on the desk", provider: "fake" }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }

      if (input === "/api/chat") {
        return new Response(
          JSON.stringify({
            sessionId: "session-1",
            turnId: "turn-1",
            replyText: "The visible desk anchor can drive a focused groove.",
            visualObservation: {
              isUsable: true,
              summary: "A current camera frame is available for this turn.",
              objects: ["desk"],
              sceneMood: "focused",
              motionEnergy: "low",
              confidence: 0.78,
              failureReason: null
            },
            musicSuggestion: {
              mood: "focused",
              tempo: "88 BPM",
              instruments: ["muted keys", "tight bass"],
              structure: "motif -> groove",
              promptForMusicGen: "focused desk groove"
            },
            followUpQuestion: "Should it stay minimal?",
            suggestedActions: ["generate_music"]
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" }
          }
        );
      }

      if (input === "/api/tts") {
        return createFallbackTtsResponse();
      }

      throw new Error(`Unexpected fetch: ${String(input)}`);
    });

    renderHome();
    clickByText("开启摄像头");
    await act(async () => {
      await Promise.resolve();
    });

    clickByText("测试识别");
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const chatBody = JSON.parse(fetchMock.mock.calls.find((call) => call[0] === "/api/chat")?.[1]?.body as string);
    expect(chatBody.snapshot).toEqual({
      mimeType: "image/webp",
      base64: "fresh-frame",
      width: 640,
      height: 360
    });
  });

  it("keeps consecutive turns visible and sends a history summary into the next chat request", async () => {
    const chatReplies = [
      {
        sessionId: "session-1",
        turnId: "turn-1",
        replyText: "First reply anchors the voice-only midnight rain idea.",
        visualObservation: {
          isUsable: false,
          summary: null,
          objects: [],
          sceneMood: null,
          motionEnergy: null,
          confidence: 0,
          failureReason: "no_visual_subject"
        },
        musicSuggestion: {
          mood: "midnight rain",
          tempo: "74 BPM",
          instruments: ["felt piano"],
          structure: "quiet intro -> pulse",
          promptForMusicGen: "midnight rain sparse felt piano"
        },
        followUpQuestion: "Can you show the lyric sheet?",
        suggestedActions: ["generate_music"]
      },
      {
        sessionId: "session-1",
        turnId: "turn-2",
        replyText: "Second reply keeps the earlier rain mood but moves toward tape-warped drums.",
        visualObservation: {
          isUsable: false,
          summary: null,
          objects: [],
          sceneMood: null,
          motionEnergy: null,
          confidence: 0,
          failureReason: "no_visual_subject"
        },
        musicSuggestion: {
          mood: "tape-warped rain",
          tempo: "82 BPM",
          instruments: ["cassette drums", "soft pad"],
          structure: "pad intro -> drum entrance",
          promptForMusicGen: "tape warped rain drums"
        },
        followUpQuestion: "Should the drums stay distant?",
        suggestedActions: ["generate_music"]
      }
    ];
    const asrTexts = ["Make it feel like midnight rain", "Now add tape-warped drums"];
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      if (input === "/audio/test-asr.wav") {
        return createTestAsrAudioResponse();
      }

      if (input === "/api/asr") {
        return new Response(JSON.stringify({ userText: asrTexts.shift(), provider: "fake" }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }

      if (input === "/api/chat") {
        return new Response(JSON.stringify(chatReplies.shift()), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }

      if (input === "/api/tts") {
        return createFallbackTtsResponse();
      }

      throw new Error(`Unexpected fetch: ${String(input)}`);
    });

    const view = renderHome();

    clickByText("测试识别");
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    clickByText("测试识别");
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(view.textContent).toContain("Make it feel like midnight rain");
    expect(view.textContent).toContain("First reply anchors the voice-only midnight rain idea.");
    expect(view.textContent).toContain("Now add tape-warped drums");
    expect(view.textContent).toContain("Second reply keeps the earlier rain mood but moves toward tape-warped drums.");

    const chatBodies = fetchMock.mock.calls
      .filter((call) => call[0] === "/api/chat")
      .map((call) => JSON.parse(call[1]?.body as string));
    expect(chatBodies).toHaveLength(2);
    expect(chatBodies[1].historySummary).toContain("Make it feel like midnight rain");
    expect(chatBodies[1].historySummary).toContain("First reply anchors the voice-only midnight rain idea.");
  });
});
