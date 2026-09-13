import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchSvgText, loadSvgImage } from "./svg-to-png";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("loadSvgImage", () => {
  it("rejects when the image never settles, instead of hanging forever", async () => {
    vi.useFakeTimers();
    // An Image whose src setter never triggers onload or onerror.
    vi.stubGlobal(
      "Image",
      class {
        onload: (() => void) | null = null;
        onerror: ((err: unknown) => void) | null = null;
        src = "";
      },
    );

    const promise = loadSvgImage("blob:never");
    promise.catch(() => {}); // avoid an unhandled rejection before we assert

    await vi.advanceTimersByTimeAsync(15_000);
    await expect(promise).rejects.toThrow(/timed out/);
  });

  it("resolves when the image loads", async () => {
    vi.stubGlobal(
      "Image",
      class {
        onload: (() => void) | null = null;
        onerror: ((err: unknown) => void) | null = null;
        set src(_value: string) {
          this.onload?.();
        }
      },
    );

    await expect(loadSvgImage("blob:ok")).resolves.toBeDefined();
  });
});

describe("fetchSvgText", () => {
  it("aborts and rejects when the request stalls", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", (_url: string, opts: { signal: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        opts.signal.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        );
      });
    });

    const promise = fetchSvgText("https://example.test/icon.svg");
    promise.catch(() => {});

    await vi.advanceTimersByTimeAsync(15_000);
    await expect(promise).rejects.toThrow();
  });
});
