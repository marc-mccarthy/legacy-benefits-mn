import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import relay, { type Env } from "../../../workers/crm-relay/src/index";
import {
  individualForm,
  noteBody,
  type RelayLead,
} from "../../../workers/crm-relay/src/map";

const SECRET = "relay-secret-for-tests-0123456789";
const TOKEN = "mp-token-SENTINEL-do-not-leak";
const ORIGIN = "https://www.medicareproapp.com/api/v1";
const KEY = "3f2b8c1e-0000-4000-8000-000000000001";

const env: Env = { RELAY_SECRET: SECRET, MEDICAREPRO_API_TOKEN: TOKEN };

const lead: RelayLead = {
  name: "TEST Websiteform",
  email: "test-lbg-crm@example.com",
  phone: "612-555-0101",
  zip: "55401",
  interest: "medicare-advantage",
  message: "TEST message",
  sourcePath: "/contact",
  consentedAt: "2026-10-16T14:02:11.000Z",
  consentVersion: "2026-09-01.1",
};

type Reply = { status: number; body?: unknown };

const fetchMock = vi.fn<typeof fetch>();

function reply(...replies: Reply[]) {
  for (const r of replies) {
    fetchMock.mockResolvedValueOnce(
      new Response(r.body === undefined ? null : JSON.stringify(r.body), {
        status: r.status,
        headers: { "content-type": "application/json" },
      }),
    );
  }
}

function calls() {
  return fetchMock.mock.calls.map(([url, init]) => ({
    url: String(url),
    method: init?.method ?? "GET",
    body: init?.body ? JSON.parse(String(init.body)) : undefined,
    init,
  }));
}

function post(body: unknown) {
  return relay.fetch(
    new Request("https://relay.test/lead", {
      method: "POST",
      headers: {
        authorization: `Bearer ${SECRET}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    }),
    env,
  );
}

const send = (attempt = 1) => post({ lead, idempotencyKey: KEY, attempt });

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("new contact", () => {
  it("creates the contact and lead in one call on attempt 1", async () => {
    reply({ status: 200, body: { indId: 123 } });

    const res = await send();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      indId: 123,
      outcome: "created",
    });
    const [create] = calls();
    expect(calls()).toHaveLength(1);
    expect(create!.url).toBe(`${ORIGIN}/individual-form`);
    expect(create!.method).toBe("POST");
    expect(create!.body).toEqual(individualForm(lead, KEY));
    const headers = new Headers(create!.init!.headers);
    expect(headers.get("authorization")).toBe(`Bearer ${TOKEN}`);
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("accept")).toBe("application/json");
    expect(create!.init!.redirect).toBe("manual");
  });
});

describe("existing contact", () => {
  it.each([true, 1, "1", "true"])(
    "reactivates the lead and adds the repeat note when is_existing is %s",
    async (flag) => {
      reply(
        {
          status: 200,
          body: { indId: 77, is_existing: flag, matched_on: "phone_name" },
        },
        { status: 200, body: {} },
        { status: 200, body: { data: [{ indNoteBody: "an older note" }] } },
        { status: 200, body: { indNoteId: 9 } },
      );

      const res = await send();

      expect(await res.json()).toEqual({
        ok: true,
        indId: 77,
        outcome: "existing",
      });
      const c = calls();
      expect(c.map((x) => `${x.method} ${x.url}`)).toEqual([
        `POST ${ORIGIN}/individual-form`,
        `POST ${ORIGIN}/individuals/77/lead`,
        `GET ${ORIGIN}/individuals/77/notes?limit=100`,
        `POST ${ORIGIN}/individuals/77/notes`,
      ]);
      expect(c[3]!.body).toEqual({
        indNoteType: "note",
        indNoteBody: noteBody(lead, KEY, true),
      });
    },
  );

  it("skips the note when one with this Ref already exists", async () => {
    reply(
      { status: 200, body: { indId: 77, is_existing: true } },
      { status: 200, body: {} },
      {
        status: 200,
        body: { data: [{ indNoteBody: `Filled out…\nRef: ${KEY}` }] },
      },
    );

    const res = await send();

    expect(await res.json()).toEqual({
      ok: true,
      indId: 77,
      outcome: "existing",
    });
    expect(calls()).toHaveLength(3);
  });

  it("treats is_existing false as a new contact", async () => {
    reply({ status: 200, body: { indId: 5, is_existing: false } });
    expect(await (await send()).json()).toEqual({
      ok: true,
      indId: 5,
      outcome: "created",
    });
    expect(calls()).toHaveLength(1);
  });

  it("stops before the note when lead activation fails", async () => {
    reply(
      { status: 200, body: { indId: 77, is_existing: true } },
      { status: 503 },
    );

    const res = await send();

    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ ok: false, retryable: true });
    expect(calls()).toHaveLength(2);
  });
});

describe("retries", () => {
  it("looks up by externalId first and stops when found", async () => {
    reply({ status: 200, body: { indId: 55 } });

    const res = await send(2);

    expect(await res.json()).toEqual({ ok: true, indId: 55, outcome: "found" });
    expect(calls().map((x) => `${x.method} ${x.url}`)).toEqual([
      `GET ${ORIGIN}/individuals/by-externalid?externalId=${KEY}`,
    ]);
  });

  it.each([
    { status: 404, body: { error: { code: "http.notFound" } } },
    { status: 200, body: {} },
    { status: 200 },
  ])("creates when the lookup finds nothing (%o)", async (notFound) => {
    reply(notFound, { status: 200, body: { indId: 66 } });

    const res = await send(3);

    expect(await res.json()).toEqual({
      ok: true,
      indId: 66,
      outcome: "created",
    });
    expect(calls()[1]!.url).toBe(`${ORIGIN}/individual-form`);
  });

  it("does not create when the lookup fails", async () => {
    reply({ status: 500 });

    const res = await send(2);

    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ ok: false, retryable: true });
    expect(calls()).toHaveLength(1);
  });
});

describe("error classification on create", () => {
  it.each([
    [500, 502, true],
    [503, 502, true],
    [408, 502, true],
    [429, 502, true],
    [401, 502, true],
    [403, 502, true],
    [400, 422, false],
    [404, 422, false],
    [409, 422, false],
    [422, 422, false],
  ])(
    "upstream %i -> relay %i, retryable %s",
    async (upstream, status, retryable) => {
      reply({ status: upstream, body: { error: { message: "nope" } } });

      const res = await send();

      expect(res.status).toBe(status);
      const json = (await res.json()) as {
        ok: boolean;
        retryable: boolean;
        error: string;
      };
      expect(json.ok).toBe(false);
      expect(json.retryable).toBe(retryable);
      expect(json.error).toMatch(new RegExp(`HTTP ${upstream}`));
    },
  );

  it("refuses a redirect without following it", async () => {
    reply({ status: 302 });

    const res = await send();

    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ ok: false, retryable: false });
    expect(calls()).toHaveLength(1);
  });

  it("treats a network error as retryable", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));

    const res = await send();

    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ ok: false, retryable: true });
  });

  it("treats a 200 without indId as retryable", async () => {
    reply({ status: 200, body: { something: "else" } });

    const res = await send();

    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ ok: false, retryable: true });
  });

  it("never puts the token or the lead in the error text", async () => {
    fetchMock.mockRejectedValueOnce(
      new TypeError(`boom ${TOKEN} ${lead.email}`),
    );

    const json = (await (await send()).json()) as { error: string };

    expect(json.error).not.toContain(TOKEN);
    expect(json.error).not.toContain(lead.email);
    expect(json.error.length).toBeLessThanOrEqual(300);
  });
});

describe("request validation", () => {
  it.each([
    ["no lead", { idempotencyKey: KEY, attempt: 1 }],
    ["no key", { lead, attempt: 1 }],
    ["no attempt", { lead, idempotencyKey: KEY }],
    ["attempt 0", { lead, idempotencyKey: KEY, attempt: 0 }],
    [
      "no email",
      { lead: { ...lead, email: "" }, idempotencyKey: KEY, attempt: 1 },
    ],
    [
      "no name",
      { lead: { ...lead, name: " " }, idempotencyKey: KEY, attempt: 1 },
    ],
    [
      "no consent",
      {
        lead: { ...lead, consentedAt: undefined },
        idempotencyKey: KEY,
        attempt: 1,
      },
    ],
  ])("rejects %s with 400 and calls nothing", async (_label, body) => {
    const res = await post(body);

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ ok: false, retryable: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a body that is not JSON with 400", async () => {
    const res = await relay.fetch(
      new Request("https://relay.test/lead", {
        method: "POST",
        headers: { authorization: `Bearer ${SECRET}` },
        body: "not json",
      }),
      env,
    );
    expect(res.status).toBe(400);
  });
});
