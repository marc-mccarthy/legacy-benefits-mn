import { describe, expect, it } from "vitest";
import type { CrmLead } from "@/lib/crm/types";
import { MockTransport } from "@/lib/crm/transports/mock";

const lead: CrmLead = {
  name: "Jane Doe",
  email: "jane@example.com",
  phone: "612-555-0100",
};

const KEY = "11111111-2222-3333-4444-555555555555";

describe("MockTransport.name", () => {
  it("identifies itself as the mock transport", () => {
    expect(new MockTransport().name).toBe("mock");
  });
});

describe("recording what it was asked to send", () => {
  it("starts with an empty log", () => {
    expect(new MockTransport().sent).toEqual([]);
  });

  it("captures the lead and key of each send", async () => {
    const transport = new MockTransport();

    await transport.send(lead, KEY);

    expect(transport.sent).toEqual([{ lead, idempotencyKey: KEY }]);
  });

  it("keeps sends in order", async () => {
    const transport = new MockTransport();

    await transport.send(lead, "key-1");
    await transport.send({ ...lead, name: "John Roe" }, "key-2");

    expect(transport.sent.map((s) => s.idempotencyKey)).toEqual([
      "key-1",
      "key-2",
    ]);
    expect(transport.sent[1].lead.name).toBe("John Roe");
  });

  it("records the attempt even when the send fails", async () => {
    const transport = new MockTransport("fatal");

    await transport.send(lead, KEY);

    expect(transport.sent).toHaveLength(1);
  });

  it("keeps a log per instance", async () => {
    const a = new MockTransport();
    const b = new MockTransport();

    await a.send(lead, KEY);

    expect(a.sent).toHaveLength(1);
    expect(b.sent).toHaveLength(0);
  });
});

describe("behaviours", () => {
  it("succeeds by default", async () => {
    await expect(new MockTransport().send(lead, KEY)).resolves.toEqual({
      ok: true,
      reference: `mock-${KEY}`,
    });
  });

  it("succeeds when told to", async () => {
    await expect(
      new MockTransport("ok").send(lead, KEY),
    ).resolves.toMatchObject({ ok: true });
  });

  it("simulates a retryable upstream failure", async () => {
    await expect(
      new MockTransport("retryable").send(lead, KEY),
    ).resolves.toEqual({
      ok: false,
      error: "simulated upstream 503",
      retryable: true,
    });
  });

  it("simulates a permanent failure", async () => {
    await expect(new MockTransport("fatal").send(lead, KEY)).resolves.toEqual({
      ok: false,
      error: "simulated invalid payload",
      retryable: false,
    });
  });

  it("keeps its behaviour across sends", async () => {
    const transport = new MockTransport("retryable");

    await transport.send(lead, "key-1");

    await expect(transport.send(lead, "key-2")).resolves.toMatchObject({
      ok: false,
      retryable: true,
    });
  });

  it("derives the reference from the key it was given", async () => {
    const result = await new MockTransport().send(lead, "key-abc");
    expect(result).toMatchObject({ reference: "mock-key-abc" });
  });
});

describe("it never touches the network", () => {
  it("succeeds with fetch removed entirely", async () => {
    const original = globalThis.fetch;
    // @ts-expect-error deliberately removing fetch for this assertion
    delete globalThis.fetch;

    try {
      await expect(new MockTransport().send(lead, KEY)).resolves.toMatchObject({
        ok: true,
      });
    } finally {
      globalThis.fetch = original;
    }
  });
});
