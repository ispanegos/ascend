import { afterEach, describe, expect, it, vi } from "vitest";
import { supabaseFetch } from "@/lib/supabase/fetch";

describe("supabaseFetch", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("retries once when a fresh token is 'issued at future'", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('{"message":"JWT issued at future"}', { status: 401 }))
      .mockResolvedValueOnce(new Response("[]", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const pending = supabaseFetch("https://db.example/rest");
    await vi.runAllTimersAsync();
    expect((await pending).status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("does not retry other failures", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"message":"JWT expired"}', { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    expect((await supabaseFetch("https://db.example/rest")).status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
