import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWithRetry } from "./http";

const rateLimited = () =>
  new Response(JSON.stringify({ error: { errors: [{ reason: "rateLimitExceeded" }] } }), { status: 403 });
const ok = () => new Response("{}", { status: 200 });
const noSleep = vi.fn(async () => {});

afterEach(() => {
  vi.unstubAllGlobals();
  noSleep.mockClear();
});

describe("fetchWithRetry", () => {
  it("retries a 403 rateLimitExceeded until it succeeds", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(rateLimited()).mockResolvedValueOnce(rateLimited()).mockResolvedValueOnce(ok());
    vi.stubGlobal("fetch", fetchMock);
    const res = await fetchWithRetry("https://x", {}, { sleep: noSleep });
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(noSleep).toHaveBeenCalledTimes(2);
  });

  it("backs off for longer each time", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(rateLimited()).mockResolvedValueOnce(rateLimited()).mockResolvedValueOnce(rateLimited()).mockResolvedValueOnce(ok()));
    const waits: number[] = [];
    await fetchWithRetry("https://x", {}, { sleep: async (ms) => void waits.push(ms) });
    expect(waits[1]).toBeGreaterThan(waits[0]);
    expect(waits[2]).toBeGreaterThan(waits[1]);
  });

  it("retries 429 and 5xx", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response("", { status: 429 })).mockResolvedValueOnce(new Response("", { status: 503 })).mockResolvedValueOnce(ok());
    vi.stubGlobal("fetch", fetchMock);
    expect((await fetchWithRetry("https://x", {}, { sleep: noSleep })).status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not retry a 403 that isn't a rate limit", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"error":{"message":"API has not been used in project"}}', { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await fetchWithRetry("https://x", {}, { sleep: noSleep });
    expect(res.status).toBe(403);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gives up after the attempt limit and returns the last response", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => rateLimited());
    vi.stubGlobal("fetch", fetchMock);
    const res = await fetchWithRetry("https://x", {}, { sleep: noSleep, maxAttempts: 3 });
    expect(res.status).toBe(403);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("leaves the body readable for the caller", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(rateLimited()));
    const res = await fetchWithRetry("https://x", {}, { sleep: noSleep, maxAttempts: 1 });
    expect(await res.text()).toContain("rateLimitExceeded");
  });
});
