import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getSiteSettings } = vi.hoisted(() => ({ getSiteSettings: vi.fn() }));

vi.mock("@/lib/payload", () => ({ getSiteSettings }));

// env() is used for real — its blank-is-absent contract is the whole point of
// the fallback chain under test.
const { getBusinessIdentity } = await import("./business");

/** A settings document with only the fields this module reads. */
function settings(overrides: Record<string, unknown> = {}) {
  return {
    businessName: "CMS Agency",
    leadNotificationEmails: "cms@agency.example",
    contact: {
      phone: "612-555-0100",
      email: "hello@agency.example",
      address: "1 Main St, Saint Paul MN",
    },
    ...overrides,
  };
}

beforeEach(() => {
  getSiteSettings.mockReset().mockResolvedValue(settings());
  vi.stubEnv("BUSINESS_NAME", undefined);
  vi.stubEnv("BUSINESS_PHONE", undefined);
  vi.stubEnv("LEAD_NOTIFICATION_EMAILS", undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("reading from site settings", () => {
  it("prefers every value the client configured in the CMS", async () => {
    vi.stubEnv("BUSINESS_NAME", "Env Agency");
    vi.stubEnv("BUSINESS_PHONE", "612-555-9999");

    await expect(getBusinessIdentity()).resolves.toEqual({
      name: "CMS Agency",
      phone: "612-555-0100",
      email: "hello@agency.example",
      address: "1 Main St, Saint Paul MN",
      notificationEmails: ["cms@agency.example"],
    });
  });

  it("reads contact details through the nested contact group", async () => {
    getSiteSettings.mockResolvedValueOnce(
      settings({ contact: { phone: "612-555-0000" } }),
    );

    const identity = await getBusinessIdentity();

    expect(identity.phone).toBe("612-555-0000");
    expect(identity.email).toBeUndefined();
    expect(identity.address).toBeUndefined();
  });

  it("survives a settings document with no contact group", async () => {
    getSiteSettings.mockResolvedValueOnce(settings({ contact: undefined }));

    const identity = await getBusinessIdentity();

    expect(identity.name).toBe("CMS Agency");
    expect(identity.phone).toBeUndefined();
  });
});

describe("when the CMS is unavailable", () => {
  it("falls back to the environment instead of rejecting", async () => {
    getSiteSettings.mockRejectedValueOnce(new Error("connection refused"));
    vi.stubEnv("BUSINESS_NAME", "Env Agency");
    vi.stubEnv("BUSINESS_PHONE", "612-555-9999");
    vi.stubEnv("LEAD_NOTIFICATION_EMAILS", "env@agency.example");

    // A CMS outage must never break lead capture — this feeds the TCPA
    // consent text written during captureLead.
    await expect(getBusinessIdentity()).resolves.toEqual({
      name: "Env Agency",
      phone: "612-555-9999",
      email: undefined,
      address: undefined,
      notificationEmails: ["env@agency.example"],
    });
  });

  it("still returns a usable identity with nothing configured anywhere", async () => {
    getSiteSettings.mockRejectedValueOnce(new Error("connection refused"));

    await expect(getBusinessIdentity()).resolves.toEqual({
      name: "this agency",
      phone: undefined,
      email: undefined,
      address: undefined,
      notificationEmails: [],
    });
  });
});

describe("business name fallback chain", () => {
  it("uses the CMS value first", async () => {
    vi.stubEnv("BUSINESS_NAME", "Env Agency");
    await expect(getBusinessIdentity()).resolves.toMatchObject({
      name: "CMS Agency",
    });
  });

  it("falls through a blank CMS field to the environment", async () => {
    // `||` rather than `??` on purpose: an editor who clears the field in the
    // admin panel saves "", which must not become the business name.
    getSiteSettings.mockResolvedValueOnce(settings({ businessName: "" }));
    vi.stubEnv("BUSINESS_NAME", "Env Agency");

    await expect(getBusinessIdentity()).resolves.toMatchObject({
      name: "Env Agency",
    });
  });

  it("falls through a blank environment variable to the generic name", async () => {
    getSiteSettings.mockResolvedValueOnce(settings({ businessName: "" }));
    vi.stubEnv("BUSINESS_NAME", "   ");

    await expect(getBusinessIdentity()).resolves.toMatchObject({
      name: "this agency",
    });
  });

  it("always yields a non-empty name", async () => {
    getSiteSettings.mockResolvedValueOnce(settings({ businessName: null }));

    // The name is interpolated into stored consent evidence; a blank one
    // would produce a record that names nobody.
    const { name } = await getBusinessIdentity();
    expect(name).toBeTruthy();
    expect(name).toBe("this agency");
  });
});

describe("optional fields normalise blanks to undefined", () => {
  it.each([
    ["phone", "contact"],
    ["email", "contact"],
    ["address", "contact"],
  ])("returns undefined rather than an empty %s", async (field) => {
    getSiteSettings.mockResolvedValueOnce(
      settings({ contact: { [field]: "" } }),
    );

    const identity = (await getBusinessIdentity()) as Record<string, unknown>;
    expect(identity[field]).toBeUndefined();
  });

  it("never hands an empty string to a `??` consumer", async () => {
    // sendLeadConfirmation does `identity?.phone ?? process.env[...]`. With
    // `??`, an empty string would win and suppress the env fallback, so the
    // normalisation to undefined here is load-bearing, not cosmetic.
    getSiteSettings.mockResolvedValueOnce(settings({ contact: { phone: "" } }));

    const { phone } = await getBusinessIdentity();
    expect(phone).not.toBe("");
    expect(phone).toBeUndefined();
  });

  it("falls through a blank CMS phone to the environment", async () => {
    getSiteSettings.mockResolvedValueOnce(settings({ contact: { phone: "" } }));
    vi.stubEnv("BUSINESS_PHONE", "612-555-9999");

    await expect(getBusinessIdentity()).resolves.toMatchObject({
      phone: "612-555-9999",
    });
  });

  it("does not fall back to the environment for email or address", async () => {
    // There is no BUSINESS_EMAIL or BUSINESS_ADDRESS; these are CMS-only.
    getSiteSettings.mockResolvedValueOnce(
      settings({ contact: { email: "", address: "" } }),
    );

    const identity = await getBusinessIdentity();
    expect(identity.email).toBeUndefined();
    expect(identity.address).toBeUndefined();
  });
});

describe("notification recipients", () => {
  it("splits the CMS field on commas", async () => {
    getSiteSettings.mockResolvedValueOnce(
      settings({ leadNotificationEmails: "a@x.example,b@x.example" }),
    );

    await expect(getBusinessIdentity()).resolves.toMatchObject({
      notificationEmails: ["a@x.example", "b@x.example"],
    });
  });

  it("trims spacing and drops empty entries", async () => {
    getSiteSettings.mockResolvedValueOnce(
      settings({ leadNotificationEmails: " a@x.example , ,b@x.example, " }),
    );

    await expect(getBusinessIdentity()).resolves.toMatchObject({
      notificationEmails: ["a@x.example", "b@x.example"],
    });
  });

  it("falls through a blank CMS field to the environment", async () => {
    getSiteSettings.mockResolvedValueOnce(
      settings({ leadNotificationEmails: "" }),
    );
    vi.stubEnv("LEAD_NOTIFICATION_EMAILS", "env@agency.example");

    await expect(getBusinessIdentity()).resolves.toMatchObject({
      notificationEmails: ["env@agency.example"],
    });
  });

  it("returns an empty list when nothing is configured", async () => {
    getSiteSettings.mockResolvedValueOnce(
      settings({ leadNotificationEmails: null }),
    );

    // sendLeadNotification turns this into { sent: false, reason:
    // "no-recipients" } rather than throwing.
    await expect(getBusinessIdentity()).resolves.toMatchObject({
      notificationEmails: [],
    });
  });

  it("returns a list of strings, never a bare string", async () => {
    getSiteSettings.mockResolvedValueOnce(
      settings({ leadNotificationEmails: "solo@x.example" }),
    );

    const { notificationEmails } = await getBusinessIdentity();
    expect(Array.isArray(notificationEmails)).toBe(true);
    expect(notificationEmails).toEqual(["solo@x.example"]);
  });
});
