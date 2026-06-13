import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CameraPreview } from "@/components/camera/CameraPreview";

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

describe("CameraPreview", () => {
  it("starts in an inactive camera state", () => {
    const view = render(<CameraPreview />);

    expect(view.textContent).toContain("Camera is off");
    expect(view.textContent).toContain("Start camera");
  });

  it("shows no_camera_permission when camera access is denied", async () => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockRejectedValue(new DOMException("Denied", "NotAllowedError"))
      }
    });

    const view = render(<CameraPreview />);
    clickByText("Start camera");

    await act(async () => {
      await Promise.resolve();
    });

    expect(view.textContent).toContain("no_camera_permission");
    expect(view.textContent).toContain("voice-only mode");
  });
});
