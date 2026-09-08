import { afterEach, describe, expect, it } from "vitest";
import { env, envAny } from "./env";

const KEY = "TEST_ENV_HELPER";
const KEY2 = "TEST_ENV_HELPER_2";

afterEach(() => {
  delete process.env[KEY];
  delete process.env[KEY2];
});

describe("env", () => {
  it("returns a set value", () => {
    process.env[KEY] = "hello";
    expect(env(KEY)).toBe("hello");
  });

  it("treats a blank value as absent", () => {
    // The bug this guards: `process.env.X ?? fallback` returns "" for a blank
    // var, because ?? only falls back on null/undefined. Every variable in
    // .env.example ships blank, so this is the normal case, not an edge case.
    process.env[KEY] = "";
    expect(env(KEY)).toBeUndefined();
    expect(env(KEY) ?? "fallback").toBe("fallback");
  });

  it("treats whitespace as absent", () => {
    process.env[KEY] = "   ";
    expect(env(KEY)).toBeUndefined();
  });

  it("trims surrounding whitespace", () => {
    process.env[KEY] = "  spaced@example.com  ";
    expect(env(KEY)).toBe("spaced@example.com");
  });

  it("returns undefined for an unset variable", () => {
    expect(env("DEFINITELY_NOT_SET_ANYWHERE")).toBeUndefined();
  });
});

describe("envAny", () => {
  it("falls through a blank variable to the next one", () => {
    process.env[KEY] = "";
    process.env[KEY2] = "second@example.com";
    expect(envAny(KEY, KEY2)).toBe("second@example.com");
  });

  it("prefers the first non-blank variable", () => {
    process.env[KEY] = "first@example.com";
    process.env[KEY2] = "second@example.com";
    expect(envAny(KEY, KEY2)).toBe("first@example.com");
  });

  it("returns undefined when all are blank", () => {
    process.env[KEY] = "";
    process.env[KEY2] = "  ";
    expect(envAny(KEY, KEY2)).toBeUndefined();
  });
});
