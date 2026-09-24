import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// `server-only` throws when imported outside a React Server Component.
vi.mock("server-only", () => ({}));

// Hoisted so the vi.mock factory can close over the same spies the tests read.
const { sesSend, clientConfigs, SESv2Client, SendEmailCommand } = vi.hoisted(
  () => {
    const sesSend = vi.fn();
    const clientConfigs: unknown[] = [];

    class SESv2Client {
      readonly send = sesSend;
      constructor(config: unknown) {
        clientConfigs.push(config);
      }
    }
    class SendEmailCommand {
      constructor(readonly input: Record<string, unknown>) {}
    }

    return { sesSend, clientConfigs, SESv2Client, SendEmailCommand };
  },
);

vi.mock("@aws-sdk/client-sesv2", () => ({ SESv2Client, SendEmailCommand }));

const { sendEmail, sendLeadConfirmation, sendLeadNotification } =
  await import("./index");

const lead = {
  name: "Jane Doe",
  email: "jane@example.com",
  phone: "612-555-0100",
  zip: "55101",
  interest: "medicare-advantage",
  message: "Please call me about my October enrollment.",
  sourcePath: "/contact",
};

type Charsetted = { Data: string; Charset: string };

/** The shape of SendEmailCommand's input that this module actually builds. */
type SesInput = {
  FromEmailAddress: string;
  Destination: { ToAddresses: string[] };
  ReplyToAddresses?: string[];
  Content: { Simple: { Subject: Charsetted; Body: { Text: Charsetted } } };
};

/** The SendEmailCommand input SES was actually handed. */
function sentCommand(): SesInput {
  return sesSend.mock.calls[0][0].input as SesInput;
}

/** The plain-text body of the sent email. */
function sentBody(): string {
  return sentCommand().Content.Simple.Body.Text.Data;
}

/** The subject block of the sent email. */
function sentSubject(): Charsetted {
  return sentCommand().Content.Simple.Subject;
}

let info: ReturnType<typeof vi.spyOn>;
let error: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  sesSend.mockReset().mockResolvedValue({ MessageId: "abc" });
  clientConfigs.length = 0;
  // A configured sender is the normal case; the unset case is tested explicitly.
  vi.stubEnv("SES_FROM_ADDRESS", "hello@agency.example");
  vi.stubEnv("LEAD_NOTIFICATION_EMAILS", undefined);
  vi.stubEnv("BUSINESS_NAME", undefined);
  vi.stubEnv("BUSINESS_PHONE", undefined);
  info = vi.spyOn(console, "info").mockImplementation(() => {});
  error = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("sendEmail", () => {
  const email = {
    to: ["agent@agency.example"],
    subject: "Subject line",
    text: "Body text",
  };

  it("skips sending when SES_FROM_ADDRESS is unset", async () => {
    vi.stubEnv("SES_FROM_ADDRESS", undefined);

    // Local dev and CI have no SES; sending must degrade to a log, not throw.
    await expect(sendEmail(email)).resolves.toEqual({
      sent: false,
      reason: "not-configured",
    });
    expect(sesSend).not.toHaveBeenCalled();
  });

  it("logs the subject and recipients when it skips", async () => {
    vi.stubEnv("SES_FROM_ADDRESS", undefined);

    await sendEmail({ ...email, to: ["a@example.com", "b@example.com"] });

    expect(info).toHaveBeenCalledWith(
      '[email] skipped (no SES_FROM_ADDRESS): "Subject line" -> a@example.com, b@example.com',
    );
  });

  it("refuses to send with no recipients", async () => {
    // SES rejects an empty ToAddresses; catching it here keeps the error out
    // of CloudWatch for what is a routine unconfigured-notifications case.
    await expect(sendEmail({ ...email, to: [] })).resolves.toEqual({
      sent: false,
      reason: "no-recipients",
    });
    expect(sesSend).not.toHaveBeenCalled();
  });

  it("sends a UTF-8 message from the configured address", async () => {
    await expect(sendEmail(email)).resolves.toEqual({ sent: true });

    expect(sentCommand()).toEqual({
      FromEmailAddress: "hello@agency.example",
      Destination: { ToAddresses: ["agent@agency.example"] },
      ReplyToAddresses: undefined,
      Content: {
        Simple: {
          Subject: { Data: "Subject line", Charset: "UTF-8" },
          Body: { Text: { Data: "Body text", Charset: "UTF-8" } },
        },
      },
    });
  });

  it("sets ReplyToAddresses when a reply-to is given", async () => {
    await sendEmail({ ...email, replyTo: "jane@example.com" });
    expect(sentCommand().ReplyToAddresses).toEqual(["jane@example.com"]);
  });

  it("leaves ReplyToAddresses undefined rather than empty", async () => {
    // An empty array is a validation error at the SES API; undefined is not.
    await sendEmail(email);
    expect(sentCommand().ReplyToAddresses).toBeUndefined();
  });

  it("swallows an SES failure so a committed lead never surfaces as an error", async () => {
    sesSend.mockRejectedValueOnce(new Error("Throttling"));

    await expect(sendEmail(email)).resolves.toEqual({
      sent: false,
      reason: "send-failed",
    });
    expect(error).toHaveBeenCalledWith(
      "[email] send failed:",
      expect.any(Error),
    );
  });
});

describe("sendEmail client construction", () => {
  /**
   * `client` is memoised at module scope and survives between tests, so any
   * assertion about constructing it needs a module instance of its own.
   */
  async function freshSendEmail() {
    vi.resetModules();
    clientConfigs.length = 0;
    return (await import("./index")).sendEmail;
  }

  const email = { to: ["a@example.com"], subject: "s", text: "t" };

  it("reuses one SES client across sends", async () => {
    const send = await freshSendEmail();

    await send(email);
    await send(email);

    // One client per warm container; reconnecting per lead would add latency
    // to every submission.
    expect(clientConfigs).toHaveLength(1);
  });

  it("uses AWS_REGION when set", async () => {
    vi.stubEnv("AWS_REGION", "eu-west-2");
    const send = await freshSendEmail();

    await send(email);

    expect(clientConfigs[0]).toEqual({ region: "eu-west-2" });
  });

  it("falls back to us-east-1", async () => {
    vi.stubEnv("AWS_REGION", undefined);
    const send = await freshSendEmail();

    await send(email);

    expect(clientConfigs[0]).toEqual({ region: "us-east-1" });
  });
});

describe("sendLeadNotification recipients", () => {
  it("prefers the addresses the caller passed in", async () => {
    vi.stubEnv("LEAD_NOTIFICATION_EMAILS", "env@agency.example");

    await sendLeadNotification(lead, {
      notificationEmails: ["caller@agency.example"],
    });

    expect(sentCommand().Destination).toEqual({
      ToAddresses: ["caller@agency.example"],
    });
  });

  it("falls back to the env var when the caller lists none", async () => {
    vi.stubEnv("LEAD_NOTIFICATION_EMAILS", "env@agency.example");

    await sendLeadNotification(lead, { notificationEmails: [] });

    expect(sentCommand().Destination).toEqual({
      ToAddresses: ["env@agency.example"],
    });
  });

  it("falls back to the env var when no business is passed at all", async () => {
    vi.stubEnv("LEAD_NOTIFICATION_EMAILS", "env@agency.example");

    await sendLeadNotification(lead);

    expect(sentCommand().Destination).toEqual({
      ToAddresses: ["env@agency.example"],
    });
  });

  it("splits, trims and drops blanks in the env var", async () => {
    vi.stubEnv("LEAD_NOTIFICATION_EMAILS", " a@x.example , ,b@x.example,");

    await sendLeadNotification(lead);

    expect(sentCommand().Destination).toEqual({
      ToAddresses: ["a@x.example", "b@x.example"],
    });
  });

  it("reports no recipients when nothing is configured anywhere", async () => {
    // The agency silently never hearing about a lead is the failure this
    // return value exists to make visible to the caller.
    await expect(sendLeadNotification(lead)).resolves.toEqual({
      sent: false,
      reason: "no-recipients",
    });
  });
});

describe("sendLeadNotification content", () => {
  beforeEach(() => {
    vi.stubEnv("LEAD_NOTIFICATION_EMAILS", "agent@agency.example");
  });

  it("names the lead in the subject and replies to them", async () => {
    await sendLeadNotification(lead);

    expect(sentSubject()).toEqual({
      Data: "New website lead: Jane Doe",
      Charset: "UTF-8",
    });
    // Reply-to is the lead so hitting reply in a mail client just works.
    expect(sentCommand().ReplyToAddresses).toEqual(["jane@example.com"]);
  });

  it("lays out every field of a complete lead", async () => {
    await sendLeadNotification(lead);

    expect(sentBody()).toBe(
      [
        "Jane Doe requested a call.",
        "",
        "Email:    jane@example.com",
        "Phone:    612-555-0100",
        "ZIP:      55101",
        "Interest: Medicare Advantage (Part C)",
        "Page:     /contact",
        "",
        "Message:\nPlease call me about my October enrollment.",
        "",
        "This lead is saved and queued to MedicarePRO.",
      ].join("\n"),
    );
  });

  it("omits the optional lines a minimal lead leaves blank", async () => {
    await sendLeadNotification({ name: "Cher", email: "cher@example.com" });

    expect(sentBody()).toBe(
      [
        "Cher requested a call.",
        "",
        "Email:    cher@example.com",
        "",
        "(no message)",
        "",
        "This lead is saved and queued to MedicarePRO.",
      ].join("\n"),
    );
  });

  it.each([
    ["medicare-advantage", "Medicare Advantage (Part C)"],
    ["supplement", "Medicare Supplement (Medigap)"],
    ["part-d", "Prescription drug coverage (Part D)"],
    ["life", "Life insurance"],
    ["other", "Something else"],
  ])("renders the human label for %s", async (value, label) => {
    await sendLeadNotification({ ...lead, interest: value });
    expect(sentBody()).toContain(`Interest: ${label}`);
  });

  it("falls back to the raw value for an unmapped interest", async () => {
    // Adding an option to the form without adding a label here must not blank
    // out the field in the agency's email.
    await sendLeadNotification({ ...lead, interest: "dental" });
    expect(sentBody()).toContain("Interest: dental");
  });

  it("marks a lead that left no message", async () => {
    await sendLeadNotification({ ...lead, message: undefined });
    const body = sentBody();
    expect(body).toContain("(no message)");
    expect(body).not.toContain("Message:");
  });
});

describe("sendLeadConfirmation", () => {
  it("writes to the lead and nobody else", async () => {
    await sendLeadConfirmation(lead);
    expect(sentCommand().Destination).toEqual({
      ToAddresses: ["jane@example.com"],
    });
  });

  it("greets the lead by first name only", async () => {
    await sendLeadConfirmation(lead);
    expect(sentBody().startsWith("Hi Jane,")).toBe(true);
  });

  it("uses the whole name when it is a single word", async () => {
    await sendLeadConfirmation({ ...lead, name: "Cher" });
    expect(sentBody().startsWith("Hi Cher,")).toBe(true);
  });

  it("prefers the business identity passed in", async () => {
    vi.stubEnv("BUSINESS_NAME", "Env Agency");

    await sendLeadConfirmation(lead, { name: "Caller Agency" });

    expect(sentSubject().Data).toBe("We got your request — Caller Agency");
    expect(sentBody()).toContain("A licensed agent at Caller Agency");
  });

  it("falls back to BUSINESS_NAME", async () => {
    vi.stubEnv("BUSINESS_NAME", "Env Agency");
    await sendLeadConfirmation(lead);
    expect(sentSubject().Data).toBe("We got your request — Env Agency");
  });

  it("falls back again to a generic name", async () => {
    // Never leave the visitor reading "A licensed agent at undefined".
    await sendLeadConfirmation(lead);
    expect(sentSubject().Data).toBe("We got your request — our team");
    expect(sentBody()).toContain("A licensed agent at our team");
  });

  it("prefers the phone passed in and pairs it with the TTY number", async () => {
    vi.stubEnv("BUSINESS_PHONE", "612-555-0000");

    await sendLeadConfirmation(lead, { phone: "612-555-9999" });

    // TTY 711 accompanies every published phone number for Section 1557.
    expect(sentBody()).toContain(
      "If you need us sooner, call 612-555-9999 (TTY 711).",
    );
  });

  it("falls back to BUSINESS_PHONE", async () => {
    vi.stubEnv("BUSINESS_PHONE", "612-555-0000");
    await sendLeadConfirmation(lead);
    expect(sentBody()).toContain("call 612-555-0000 (TTY 711).");
  });

  it("omits the call line entirely when no phone is known", async () => {
    await sendLeadConfirmation(lead);
    expect(sentBody()).not.toContain("If you need us sooner");
  });

  it("tells the visitor how to get their details removed", async () => {
    // A confirmation to someone who never filled the form needs an exit.
    await sendLeadConfirmation(lead);
    expect(sentBody()).toContain(
      "If you did not fill in a form on our website, reply to this message and we will remove your details.",
    );
  });
});
