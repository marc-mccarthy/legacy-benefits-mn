import { describe, expect, it } from "vitest";
import relay, { type Env } from "../../../workers/crm-relay/src/index";

const SECRET = "relay-secret-for-tests-0123456789";

const env: Env = {
  RELAY_SECRET: SECRET,
  MEDICAREPRO_API_TOKEN: "mp-token-for-tests",
};

function call(path: string, init: RequestInit = {}, e: Env = env) {
  return relay.fetch(new Request(`https://relay.test${path}`, init), e);
}

describe("crm-relay routing", () => {
  it("answers GET /health with 200 and no auth", async () => {
    const res = await call("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("returns 404 for an unknown path", async () => {
    const res = await call("/nope");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
  });

  it("returns 405 for GET /lead", async () => {
    const res = await call("/lead", {
      headers: { authorization: `Bearer ${SECRET}` },
    });
    expect(res.status).toBe(405);
  });
});

describe("crm-relay auth on POST /lead", () => {
  it("rejects a missing authorization header with 401", async () => {
    const res = await call("/lead", { method: "POST", body: "{}" });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("rejects a wrong bearer token with 401", async () => {
    const res = await call("/lead", {
      method: "POST",
      body: "{}",
      headers: { authorization: `Bearer ${SECRET}x` },
    });
    expect(res.status).toBe(401);
  });

  it("rejects a non-bearer scheme with 401", async () => {
    const res = await call("/lead", {
      method: "POST",
      body: "{}",
      headers: { authorization: SECRET },
    });
    expect(res.status).toBe(401);
  });

  it("fails closed with 503 when RELAY_SECRET is not configured", async () => {
    const res = await call(
      "/lead",
      {
        method: "POST",
        body: "{}",
        headers: { authorization: "Bearer " },
      },
      { ...env, RELAY_SECRET: "" },
    );
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "Relay not configured" });
  });

  it("fails closed with 503 when MEDICAREPRO_API_TOKEN is not configured", async () => {
    const res = await call(
      "/lead",
      {
        method: "POST",
        body: "{}",
        headers: { authorization: `Bearer ${SECRET}` },
      },
      { ...env, MEDICAREPRO_API_TOKEN: "" },
    );
    expect(res.status).toBe(503);
  });
});
