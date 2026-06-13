import { describe, expect, it, vi } from "vitest";

import { calculateSnapshotSize, chooseSnapshotMimeType } from "@/lib/client/camera";

describe("camera snapshot helpers", () => {
  it("fits landscape frames inside the 768px PR1 width limit", () => {
    expect(calculateSnapshotSize(1920, 1080)).toEqual({ width: 768, height: 432 });
  });

  it("preserves smaller frame dimensions without upscaling", () => {
    expect(calculateSnapshotSize(640, 480)).toEqual({ width: 640, height: 480 });
  });

  it("chooses WebP when the browser can encode it", () => {
    const canvas = {
      toDataURL: vi.fn((mimeType: string) => (mimeType === "image/webp" ? "data:image/webp;base64,abc" : ""))
    } as unknown as HTMLCanvasElement;

    expect(chooseSnapshotMimeType(canvas)).toBe("image/webp");
  });

  it("falls back to JPEG when WebP is unavailable", () => {
    const canvas = {
      toDataURL: vi.fn((mimeType: string) =>
        mimeType === "image/jpeg" ? "data:image/jpeg;base64,abc" : "data:image/png;base64,abc"
      )
    } as unknown as HTMLCanvasElement;

    expect(chooseSnapshotMimeType(canvas)).toBe("image/jpeg");
  });
});
