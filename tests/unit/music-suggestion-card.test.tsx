import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { MusicSuggestionCard } from "@/components/chat/MusicSuggestionCard";
import type { MusicSuggestion } from "@/lib/contracts/chat";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function renderMusicSuggestion(suggestion: MusicSuggestion) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  act(() => {
    root?.render(<MusicSuggestionCard suggestion={suggestion} suggestedActions={["generate_music"]} />);
  });

  return container;
}

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  container?.remove();
  container = null;
  root = null;
});

describe("MusicSuggestionCard", () => {
  it("renders available music direction fields", () => {
    const view = renderMusicSuggestion({
      mood: "midnight rain",
      tempo: "74 BPM",
      instruments: ["felt piano", "soft pad"],
      structure: "quiet intro -> pulse",
      promptForMusicGen: "midnight rain sparse felt piano"
    });

    expect(view.textContent).toContain("midnight rain");
    expect(view.textContent).toContain("74 BPM");
    expect(view.textContent).toContain("felt piano");
    expect(view.textContent).toContain("soft pad");
    expect(view.textContent).toContain("quiet intro -> pulse");
    expect(view.textContent).toContain("Generate music");
  });

  it("omits empty optional fields without hiding populated fields", () => {
    const view = renderMusicSuggestion({
      mood: "restless",
      tempo: null,
      instruments: ["dry kick"],
      structure: null,
      promptForMusicGen: null
    });

    expect(view.textContent).toContain("restless");
    expect(view.textContent).toContain("dry kick");
    expect(view.textContent).not.toContain("Tempo");
    expect(view.textContent).not.toContain("Structure");
  });
});
