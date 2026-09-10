import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyTurnstile } from "./turnstile";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

let fetchMock: ReturnType<typeof vi.fn>;

/** Minimal stand-in for the parts of Response the verifier reads. */
function response(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

/** The form body posted to Cloudflare. */
function sentBody(): URLSearchParams {
  return (fetchMock.mock.calls[0][1] as RequestInit).body as URLSearchParams;
}

beforeEach(() => {
  fetchMock = vi.fn(async () => response({ success: true }));
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("TURNSTILE_SECRET", "secret-key");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("with no secret configured", () => {
  it("skips verification rather than failing closed", async () => {
    vi.stubEnv("TURNSTILE_SECRET", undefined);

    // Deliberate: local dev and CI have no Cloudflare credentials, and the
    // form must stay testable without them.
    await expect(verifyTurnstile(undefined)).resolves.toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("skips verification even when a token is supplied", async () => {
    vi.stubEnv("TURNSTILE_SECRET", undefined);
    await expect(verifyTurnstile("tok-123")).resolves.toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("treats an empty secret as unset", async () => {
    // .env.example ships every variable blank, so "" is the common state.
    vi.stubEnv("TURNSTILE_SECRET", "");
    await expect(verifyTurnstile(undefined)).resolves.toBe(true);
  });
});

describe("a whitespace-only secret", () => {
  // REGRESSION GUARD.
  //
  // "" is falsy so it skips verification, but "   " used to be truthy — a
  // single stray space flipped the module from "skip" to "verify against a
  // garbage secret". Cloudflare rejected it, so /api/leads answered 403 to
  // every legitimate submission and the contact form died site-wide, looking
  // like Cloudflare being flaky. Skipping instead would have silently turned
  // bot protection off in production. Neither default is one anyone chose, so
  // it now throws.
  it.each(["   ", "\n", "\t", " \n "])(
    "throws rather than guessing a default for %j",
    async (value) => {
      vi.stubEnv("TURNSTILE_SECRET", value);

      await expect(verifyTurnstile("tok-123")).rejects.toThrow(
        "TURNSTILE_SECRET is set but contains only whitespace",
      );
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("names both ways out in the error", async () => {
    vi.stubEnv("TURNSTILE_SECRET", "   ");

    await expect(verifyTurnstile("tok-123")).rejects.toThrow(
      "Set it to a real secret key, or leave it empty to skip verification.",
    );
  });
});

describe("a real secret with surrounding whitespace", () => {
  it("is trimmed rather than rejected", async () => {
    // A key pasted with a trailing newline is a routine mistake and should
    // still verify.
    vi.stubEnv("TURNSTILE_SECRET", " secret-key\n");

    await expect(verifyTurnstile("tok-123")).resolves.toBe(true);
    expect(sentBody().get("secret")).toBe("secret-key");
  });
});

describe("with a secret but no token", () => {
  it("rejects a missing token without calling Cloudflare", async () => {
    await expect(verifyTurnstile(undefined)).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an empty token", async () => {
    await expect(verifyTurnstile("")).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("the verification request", () => {
  it("posts the secret and token to Cloudflare", async () => {
    await verifyTurnstile("tok-123");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(VERIFY_URL);
    expect(init.method).toBe("POST");
    expect(sentBody().get("secret")).toBe("secret-key");
    expect(sentBody().get("response")).toBe("tok-123");
  });

  it("includes the client IP when one is known", async () => {
    await verifyTurnstile("tok-123", "203.0.113.5");
    expect(sentBody().get("remoteip")).toBe("203.0.113.5");
  });

  it("omits remoteip entirely when no IP is known", async () => {
    await verifyTurnstile("tok-123");
    expect(sentBody().has("remoteip")).toBe(false);
  });

  it("sends the body as form data, not JSON", async () => {
    // The siteverify endpoint expects application/x-www-form-urlencoded,
    // which URLSearchParams sets automatically.
    await verifyTurnstile("tok-123");
    expect(sentBody()).toBeInstanceOf(URLSearchParams);
  });
});

describe("interpreting Cloudflare's answer", () => {
  it("accepts an explicit success", async () => {
    fetchMock.mockResolvedValueOnce(response({ success: true }));
    await expect(verifyTurnstile("tok-123")).resolves.toBe(true);
  });

  it("rejects an explicit failure", async () => {
    fetchMock.mockResolvedValueOnce(
      response({ success: false, "error-codes": ["invalid-input-response"] }),
    );
    await expect(verifyTurnstile("tok-123")).resolves.toBe(false);
  });

  it("rejects a response with no success field", async () => {
    fetchMock.mockResolvedValueOnce(response({}));
    await expect(verifyTurnstile("tok-123")).resolves.toBe(false);
  });

  it.each([
    ['the string "true"', "true"],
    ["the number 1", 1],
    ["null", null],
  ])("rejects %s as a success value", async (_label, value) => {
    // Strict `=== true`, so nothing truthy-but-wrong can pass the gate.
    fetchMock.mockResolvedValueOnce(response({ success: value }));
    await expect(verifyTurnstile("tok-123")).resolves.toBe(false);
  });
});

describe("when Cloudflare is unreachable or unhappy", () => {
  it("rejects when the request throws", async () => {
    fetchMock.mockRejectedValueOnce(new Error("ECONNRESET"));

    // Fails closed: an unverifiable submission is not a verified one.
    await expect(verifyTurnstile("tok-123")).resolves.toBe(false);
  });

  it("rejects when the body is not JSON", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected token < in JSON");
      },
    } as unknown as Response);

    await expect(verifyTurnstile("tok-123")).resolves.toBe(false);
  });

  it("rejects a 5xx that still carries a failure body", async () => {
    // res.ok is never consulted; the decision rests entirely on `success`.
    fetchMock.mockResolvedValueOnce(response({ success: false }, 500));
    await expect(verifyTurnstile("tok-123")).resolves.toBe(false);
  });

  it("would accept a 5xx whose body claims success", async () => {
    // Pins the consequence of not checking res.ok. Harmless in practice —
    // Cloudflare does not return success:true with an error status — but it
    // documents that the status code is not part of the decision.
    fetchMock.mockResolvedValueOnce(response({ success: true }, 500));
    await expect(verifyTurnstile("tok-123")).resolves.toBe(true);
  });
});
