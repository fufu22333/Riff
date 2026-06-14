import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { VisualEvidence } from "@/components/chat/VisualEvidence";
import type { VisualObservation } from "@/lib/contracts/chat";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function renderVisualEvidence(observation: VisualObservation) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  act(() => {
    root?.render(<VisualEvidence observation={observation} />);
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

describe("VisualEvidence", () => {
  it("renders usable visual evidence with objects and confidence", () => {
    const view = renderVisualEvidence({
      isUsable: true,
      summary: "A dim desk with headphones and a small keyboard is visible.",
      objects: ["headphones", "keyboard"],
      sceneMood: "dim / focused",
      motionEnergy: "low",
      confidence: 0.78,
      failureReason: null
    });

    expect(view.textContent).toContain("A dim desk with headphones and a small keyboard is visible.");
    expect(view.textContent).toContain("headphones");
    expect(view.textContent).toContain("keyboard");
    expect(view.textContent).toContain("dim / focused");
    expect(view.textContent).toContain("78%");
  });

  it("renders a clear visual failure reason when the scene is unusable", () => {
    const view = renderVisualEvidence({
      isUsable: false,
      summary: null,
      objects: [],
      sceneMood: null,
      motionEnergy: null,
      confidence: 0,
      failureReason: "no_visual_subject"
    });

    expect(view.textContent).toContain("no_visual_subject");
    expect(view.textContent).toContain("Riff 没有编造画面");
  });

  it("labels low confidence usable observations", () => {
    const view = renderVisualEvidence({
      isUsable: true,
      summary: "The image is usable but uncertain.",
      objects: [],
      sceneMood: "uncertain",
      motionEnergy: "medium",
      confidence: 0.34,
      failureReason: null
    });

    expect(view.textContent).toContain("置信度较低");
    expect(view.textContent).toContain("34%");
  });
});
