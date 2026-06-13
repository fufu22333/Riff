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
  it("submits ASR userText to /api/chat and renders the structured response", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
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
            suggestedActions: ["generate_music"]
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

    clickByText("Test ASR");

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
  });
});
