import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getBusinessIdentity } = await import("@/lib/business");

const VARS = [
  "BUSINESS_NAME",
  "BUSINESS_PHONE",
  "BUSINESS_EMAIL",
  "BUSINESS_ADDRESS",
  "LEAD_NOTIFICATION_EMAILS",
] as const;

beforeEach(() => {
  for (const name of VARS) vi.stubEnv(name, undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("the environment is the only source", () => {
  it("returns every value from the environment", async () => {
    vi.stubEnv("BUSINESS_NAME", "Env Agency");
    vi.stubEnv("BUSINESS_PHONE", "612-555-9999");
    vi.stubEnv("BUSINESS_EMAIL", "env@agency.example");
    vi.stubEnv("BUSINESS_ADDRESS", "9 Env Rd, Saint Paul MN");
    vi.stubEnv("LEAD_NOTIFICATION_EMAILS", "env@agency.example");

    await expect(getBusinessIdentity()).resolves.toEqual({
      name: "Env Agency",
      phone: "612-555-9999",
      email: "env@agency.example",
      address: "9 Env Rd, Saint Paul MN",
      notificationEmails: ["env@agency.example"],
    });
  });

  it("reads each variable independently", async () => {
    vi.stubEnv("BUSINESS_NAME", "Env Agency");
    vi.stubEnv("BUSINESS_PHONE", "612-555-0000");

    const identity = await getBusinessIdentity();

    expect(identity.phone).toBe("612-555-0000");
    expect(identity.email).toBeUndefined();
    expect(identity.address).toBeUndefined();
  });
});

describe("a missing name is fatal, never substituted", () => {
  it("throws when BUSINESS_NAME is unset", async () => {
    await expect(getBusinessIdentity()).rejects.toThrow(/BUSINESS_NAME/);
  });

  it("throws when BUSINESS_NAME is blank", async () => {
    vi.stubEnv("BUSINESS_NAME", "");
    await expect(getBusinessIdentity()).rejects.toThrow(/BUSINESS_NAME/);
  });

  it("throws when BUSINESS_NAME is only whitespace", async () => {
    vi.stubEnv("BUSINESS_NAME", "   ");
    await expect(getBusinessIdentity()).rejects.toThrow(/BUSINESS_NAME/);
  });

  it("never invents a name", async () => {
    await expect(getBusinessIdentity()).rejects.toThrow();
  });
});

describe("blank is absent for the optional values", () => {
  it.each(["BUSINESS_PHONE", "BUSINESS_EMAIL", "BUSINESS_ADDRESS"])(
    "treats a blank %s as undefined",
    async (name) => {
      vi.stubEnv("BUSINESS_NAME", "Env Agency");
      vi.stubEnv(name, "   ");

      const identity = await getBusinessIdentity();
      const key = name.replace("BUSINESS_", "").toLowerCase() as
        "phone" | "email" | "address";

      expect(identity[key]).toBeUndefined();
    },
  );
});

describe("notification recipients", () => {
  beforeEach(() => {
    vi.stubEnv("BUSINESS_NAME", "Env Agency");
  });

  it("splits a comma-separated list", async () => {
    vi.stubEnv("LEAD_NOTIFICATION_EMAILS", "a@x.example,b@x.example");

    await expect(getBusinessIdentity()).resolves.toMatchObject({
      notificationEmails: ["a@x.example", "b@x.example"],
    });
  });

  it("trims whitespace around each address", async () => {
    vi.stubEnv("LEAD_NOTIFICATION_EMAILS", " a@x.example ,  b@x.example ");

    await expect(getBusinessIdentity()).resolves.toMatchObject({
      notificationEmails: ["a@x.example", "b@x.example"],
    });
  });

  it("drops empty entries from a trailing or doubled comma", async () => {
    vi.stubEnv("LEAD_NOTIFICATION_EMAILS", "a@x.example,,b@x.example,");

    await expect(getBusinessIdentity()).resolves.toMatchObject({
      notificationEmails: ["a@x.example", "b@x.example"],
    });
  });

  it("returns an empty list when unset, never a bare string", async () => {
    const { notificationEmails } = await getBusinessIdentity();
    expect(Array.isArray(notificationEmails)).toBe(true);
    expect(notificationEmails).toEqual([]);
  });
});

describe("no database and no content module", () => {
  it("imports neither", async () => {
    const source = await import("node:fs").then((fs) =>
      fs.readFileSync(
        new URL("../../src/lib/business.ts", import.meta.url),
        "utf8",
      ),
    );

    expect(source).not.toContain("@/content/site");
    expect(source).not.toContain("@/lib/db");
  });
});
