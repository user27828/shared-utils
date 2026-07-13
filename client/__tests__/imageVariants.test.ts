import { afterEach, describe, expect, it, vi } from "vitest";

import { generateImageVariants } from "../src/fm/utils/imageVariants.js";

class FakeWorker {
  static last: FakeWorker | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  terminated = false;

  constructor() {
    FakeWorker.last = this;
  }

  postMessage(): void {
    queueMicrotask(() => {
      this.onerror?.(new ErrorEvent("error"));
    });
  }

  terminate(): void {
    this.terminated = true;
  }
}

class FakeOffscreenCanvas {
  constructor(
    readonly width: number,
    readonly height: number,
  ) {}

  getContext(): { drawImage: () => void } {
    return { drawImage: vi.fn() };
  }

  transferToImageBitmap(): ImageBitmap {
    return {
      width: this.width,
      height: this.height,
      close: vi.fn(),
    } as unknown as ImageBitmap;
  }

  async convertToBlob(): Promise<Blob> {
    return new Blob(["variant"], { type: "image/jpeg" });
  }
}

describe("generateImageVariants resource cleanup", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("terminates a worker before falling back after a worker error", async () => {
    const sourceBitmap = {
      width: 1,
      height: 1,
      close: vi.fn(),
    } as unknown as ImageBitmap;
    const createImageBitmap = vi.fn(async () => sourceBitmap);

    vi.stubGlobal("Worker", FakeWorker);
    vi.stubGlobal("OffscreenCanvas", FakeOffscreenCanvas);
    Object.defineProperty(window, "createImageBitmap", {
      configurable: true,
      value: createImageBitmap,
    });

    const result = await generateImageVariants({
      file: new Blob(["source"], { type: "image/png" }),
      widths: [1],
    });

    expect(FakeWorker.last?.terminated).toBe(true);
    expect(createImageBitmap).toHaveBeenCalledOnce();
    expect(result.variants).toHaveLength(1);
  });

  it("closes the source bitmap when main-thread encoding fails", async () => {
    const sourceBitmap = {
      width: 1,
      height: 1,
      close: vi.fn(),
    } as unknown as ImageBitmap;

    class FailingCanvas extends FakeOffscreenCanvas {
      override async convertToBlob(): Promise<Blob> {
        throw new Error("encoding failed");
      }
    }

    vi.stubGlobal("Worker", undefined);
    vi.stubGlobal("OffscreenCanvas", FailingCanvas);
    Object.defineProperty(window, "createImageBitmap", {
      configurable: true,
      value: vi.fn(async () => sourceBitmap),
    });

    await expect(
      generateImageVariants({
        file: new Blob(["source"], { type: "image/png" }),
        widths: [1],
      }),
    ).rejects.toThrow("encoding failed");

    expect(sourceBitmap.close).toHaveBeenCalledOnce();
  });
});
