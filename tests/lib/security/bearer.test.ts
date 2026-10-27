import { describe, expect, it } from "vitest";
import {
  bearerMatches,
  headerOrBearerMatches,
  secretMatches,
} from "@/lib/security/bearer";

function req(headers: Record<string, string>) {
  return new Request("https://example.test", { headers });
}

describe("secretMatches", () => {
  it("matches an identical string", () => {
    expect(secretMatches("abc", "abc")).toBe(true);
  });

  it.each([["abd"], ["ab"], ["abcd"], [""], [null], [undefined]])(
    "rejects %s",
    (provided) => {
      expect(secretMatches(provided, "abc")).toBe(false);
    },
  );
});

describe("bearerMatches", () => {
  it("matches a correct bearer", () => {
    expect(bearerMatches(req({ authorization: "Bearer abc" }), "abc")).toBe(
      true,
    );
  });

  it.each([
    [{}],
    [{ authorization: "Basic abc" }],
    [{ authorization: "Bearer x" }],
  ])("rejects %j", (headers) => {
    expect(bearerMatches(req(headers), "abc")).toBe(false);
  });
});

describe("headerOrBearerMatches", () => {
  it("accepts the named header alone", () => {
    expect(headerOrBearerMatches(req({ "x-t": "abc" }), "x-t", "abc")).toBe(
      true,
    );
  });

  it("falls back to the bearer when the header is absent", () => {
    expect(
      headerOrBearerMatches(req({ authorization: "Bearer abc" }), "x-t", "abc"),
    ).toBe(true);
  });

  it("lets a wrong header veto a correct bearer", () => {
    expect(
      headerOrBearerMatches(
        req({ "x-t": "bad", authorization: "Bearer abc" }),
        "x-t",
        "abc",
      ),
    ).toBe(false);
  });

  it("rejects when neither is present", () => {
    expect(headerOrBearerMatches(req({}), "x-t", "abc")).toBe(false);
  });
});
