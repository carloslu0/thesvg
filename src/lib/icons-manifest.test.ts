import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Each test re-imports the module so its cachedIcons / fetchPromise module state
// starts clean, and runs in production mode so the dev 404 fallback (which pulls
// in the real data file) never fires.
async function freshModule() {
  vi.resetModules();
  return import("./icons-manifest");
}

const SAMPLE = [{ slug: "acme", variants: { default: "/icons/acme/default.svg" } }];

/** A fetch that never resolves until its AbortSignal fires, like a real stall. */
function stalledFetch(_url: string, opts?: { signal?: AbortSignal }) {
  return new Promise<Response>((_resolve, reject) => {
    opts?.signal?.addEventListener("abort", () =>
      reject(new DOMException("Aborted", "AbortError")),
    );
  });
}

function okResponse(body: unknown): Response {
  return { ok: true, json: async () => body } as unknown as Response;
}

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("loadIconsManifest", () => {
  it("aborts and rejects when the fetch stalls past the timeout", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(stalledFetch));
    const { loadIconsManifest } = await freshModule();

    const promise = loadIconsManifest();
    const assertion = expect(promise).rejects.toThrow();
    // Advance past both attempts' timeouts so each stalled fetch is aborted.
    await vi.advanceTimersByTimeAsync(60000);
    await assertion;
  });

  it("retries once and resolves when the second attempt succeeds", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(stalledFetch)
      .mockImplementationOnce(async () => okResponse(SAMPLE));
    vi.stubGlobal("fetch", fetchMock);
    const { loadIconsManifest } = await freshModule();

    const promise = loadIconsManifest();
    await vi.advanceTimersByTimeAsync(60000);

    await expect(promise).resolves.toEqual(SAMPLE);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("caches the manifest so a second call does not refetch", async () => {
    const fetchMock = vi.fn(async () => okResponse(SAMPLE));
    vi.stubGlobal("fetch", fetchMock);
    const { loadIconsManifest } = await freshModule();

    await expect(loadIconsManifest()).resolves.toEqual(SAMPLE);
    await expect(loadIconsManifest()).resolves.toEqual(SAMPLE);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects on a non-ok response in production", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500 }) as Response),
    );
    const { loadIconsManifest } = await freshModule();

    await expect(loadIconsManifest()).rejects.toThrow(/500/);
  });
});
