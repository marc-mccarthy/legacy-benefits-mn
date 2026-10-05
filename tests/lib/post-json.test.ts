import { afterEach, describe, expect, it, vi } from "vitest";
import { postJson, sha256Hex } from "@/lib/post-json";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sha256Hex", () => {
  it("hashes the empty string to the known vector", async () => {
    await expect(sha256Hex("")).resolves.toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("hashes the UTF-8 bytes of the text", async () => {
    await expect(sha256Hex("abc")).resolves.toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});

describe("postJson", () => {
  it("sends the exact body with its SHA-256 in x-amz-content-sha256", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null));
    vi.stubGlobal("fetch", fetchMock);

    await postJson("/api/soa", { name: "Zoë" });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(url).toBe("/api/soa");
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"name":"Zoë"}');
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["x-amz-content-sha256"]).toBe(
      await sha256Hex(init.body as string),
    );
  });
});
