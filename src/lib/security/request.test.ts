import { describe, expect, it } from "vitest";
import { clientIp, hasGlobalPrivacyControl } from "./request";

function req(headers: Record<string, string> = {}) {
  return new Request("https://agency.example/", { headers });
}

describe("clientIp", () => {
  it("takes the first hop as the client", () => {
    // Behind CloudFront and the ALB the chain is client, edge, balancer —
    // only the first entry is the visitor.
    expect(
      clientIp(req({ "x-forwarded-for": "203.0.113.5, 70.41.3.18, 10.0.0.1" })),
    ).toBe("203.0.113.5");
  });

  it("trims surrounding whitespace", () => {
    expect(
      clientIp(req({ "x-forwarded-for": "  203.0.113.5 , 70.41.3.18" })),
    ).toBe("203.0.113.5");
  });

  it("handles a single-hop header", () => {
    expect(clientIp(req({ "x-forwarded-for": "203.0.113.5" }))).toBe(
      "203.0.113.5",
    );
  });

  it("passes an IPv6 address through", () => {
    expect(
      clientIp(req({ "x-forwarded-for": "2001:db8::1, 70.41.3.18" })),
    ).toBe("2001:db8::1");
  });

  it("returns undefined with no header", () => {
    expect(clientIp(req())).toBeUndefined();
  });

  it.each([
    ["an empty header", ""],
    ["a whitespace-only header", "   "],
    ["a leading comma", ", 70.41.3.18"],
  ])(
    "returns undefined for %s rather than an empty string",
    (_label, value) => {
      // An empty string would be hashed and stored as if it were an address.
      expect(clientIp(req({ "x-forwarded-for": value }))).toBeUndefined();
    },
  );
});

describe("hasGlobalPrivacyControl", () => {
  it("detects the signal", () => {
    // Under CPRA and several state laws GPC is a legally binding opt-out of
    // sale/sharing, so it is honoured automatically with no banner shown.
    expect(hasGlobalPrivacyControl(req({ "sec-gpc": "1" }))).toBe(true);
  });

  it("returns false when the header is absent", () => {
    expect(hasGlobalPrivacyControl(req())).toBe(false);
  });

  it.each([
    ["0", "0"],
    ["an empty value", ""],
    ["true", "true"],
    ["yes", "yes"],
  ])("does not treat %s as a signal", (_label, value) => {
    // The spec defines exactly one enabled value; anything else is not an
    // opt-out and must not be guessed at in either direction.
    expect(hasGlobalPrivacyControl(req({ "sec-gpc": value }))).toBe(false);
  });

  it("returns a boolean, never the header string", () => {
    expect(typeof hasGlobalPrivacyControl(req({ "sec-gpc": "1" }))).toBe(
      "boolean",
    );
  });
});
