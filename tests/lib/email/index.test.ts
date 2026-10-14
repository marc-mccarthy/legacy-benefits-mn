import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

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
  await import("@/lib/email/index");

const lead = {
  name: "Jane Doe",
  email: "jane@example.com",
  phone: "612-555-0100",
  zip: "55101",
  interest: "medicare-advantage",
  message: "Please call me about my October enrollment.",
  consent: true,
};

type Charsetted = { Data: string; Charset: string };

type SesInput = {
  FromEmailAddress: string;
  Destination: { ToAddresses: string[] };
  ReplyToAddresses?: string[];
  Content: {
    Simple: {
      Subject: Charsetted;
      Body: { Text: Charsetted; Html?: Charsetted };
    };
  };
};

function sentCommand(): SesInput {
  return sesSend.mock.calls[0][0].input as SesInput;
}

function sentBody(): string {
  return sentCommand().Content.Simple.Body.Text.Data;
}

function sentHtml(): string {
  return sentCommand().Content.Simple.Body.Html?.Data ?? "";
}

function sentSubject(): Charsetted {
  return sentCommand().Content.Simple.Subject;
}

let info: ReturnType<typeof vi.spyOn>;
let error: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  sesSend.mockReset().mockResolvedValue({ MessageId: "abc" });
  clientConfigs.length = 0;
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

  it("adds an HTML part only when one is given", async () => {
    await sendEmail({ ...email, html: "<p>Body</p>" });
    expect(sentCommand().Content.Simple.Body).toEqual({
      Text: { Data: "Body text", Charset: "UTF-8" },
      Html: { Data: "<p>Body</p>", Charset: "UTF-8" },
    });
  });

  it("leaves ReplyToAddresses undefined rather than empty", async () => {
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
  async function freshSendEmail() {
    vi.resetModules();
    clientConfigs.length = 0;
    return (await import("@/lib/email/index")).sendEmail;
  }

  const email = { to: ["a@example.com"], subject: "s", text: "t" };

  it("reuses one SES client across sends", async () => {
    const send = await freshSendEmail();

    await send(email);
    await send(email);

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

  it("titles the email with the business and the lead's name and replies to them", async () => {
    await sendLeadNotification(lead, { name: "Legacy Benefits Group" });

    expect(sentSubject()).toEqual({
      Data: "Legacy Benefits Group - New Lead: Jane Doe",
      Charset: "UTF-8",
    });
    expect(sentCommand().ReplyToAddresses).toEqual(["jane@example.com"]);
  });

  it("falls back to BUSINESS_NAME, then a generic name, in the title", async () => {
    vi.stubEnv("BUSINESS_NAME", "Env Agency");
    await sendLeadNotification(lead);
    expect(sentSubject().Data).toBe("Env Agency - New Lead: Jane Doe");

    sesSend.mockClear();
    vi.stubEnv("BUSINESS_NAME", undefined);
    await sendLeadNotification(lead);
    expect(sentSubject().Data).toBe(
      "Legacy Benefits Group - New Lead: Jane Doe",
    );
  });

  it("lays out every field of a complete lead as aligned plain text", async () => {
    await sendLeadNotification(lead);

    expect(sentBody()).toBe(
      [
        "New contact form from Jane Doe",
        "",
        "Name:                Jane Doe",
        "Email:               jane@example.com",
        "Phone:               612-555-0100",
        "ZIP code:            55101",
        "Interested in:       Medicare Advantage (Part C)",
        "Consent to contact:  Yes",
        "",
        "Message:",
        "Please call me about my October enrollment.",
        "",
        "Reply to this email to answer Jane Doe directly.",
      ].join("\n"),
    );
  });

  it("shows every field of a minimal lead, marking the blank ones", async () => {
    await sendLeadNotification({ name: "Cher", email: "cher@example.com" });

    expect(sentBody()).toBe(
      [
        "New contact form from Cher",
        "",
        "Name:                Cher",
        "Email:               cher@example.com",
        "Phone:               Not provided",
        "ZIP code:            Not provided",
        "Interested in:       Not provided",
        "Consent to contact:  Not recorded",
        "",
        "Message:",
        "(no message)",
        "",
        "Reply to this email to answer Cher directly.",
      ].join("\n"),
    );
  });

  it("treats empty strings from the form as not provided", async () => {
    await sendLeadNotification({
      ...lead,
      phone: "",
      zip: "",
      interest: "",
      message: "",
    });
    const body = sentBody();

    expect(body).toContain("Phone:               Not provided");
    expect(body).toContain("ZIP code:            Not provided");
    expect(body).toContain("Interested in:       Not provided");
    expect(body).toContain("Message:\n(no message)");
    expect(sentHtml()).not.toContain('href="tel:');
  });

  it("no longer claims the lead was queued to MedicarePRO", async () => {
    await sendLeadNotification(lead);
    expect(sentBody()).not.toContain("MedicarePRO");
    expect(sentHtml()).not.toContain("MedicarePRO");
  });

  it("sends an HTML table with a row per form field and linked email and phone", async () => {
    await sendLeadNotification(lead);
    const html = sentHtml();

    const labels = [...html.matchAll(/<th[^>]*>([^<]+)<\/th>/g)].map(
      (m) => m[1],
    );
    expect(labels).toEqual([
      "Name",
      "Email",
      "Phone",
      "ZIP code",
      "Interested in",
      "Consent to contact",
    ]);
    expect(html).toContain('href="mailto:jane@example.com"');
    expect(html).toContain('href="tel:6125550100"');
    expect(html).toContain("Please call me about my October enrollment.");
    expect(sentCommand().Content.Simple.Body.Html?.Charset).toBe("UTF-8");
  });

  it("escapes HTML a visitor types into the form", async () => {
    await sendLeadNotification({
      ...lead,
      name: '<b>Eve</b> & "Co"',
      message: "<script>alert(1)</script>",
    });
    const html = sentHtml();

    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<b>Eve</b>");
    expect(html).toContain("&lt;b&gt;Eve&lt;/b&gt; &amp; &quot;Co&quot;");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it.each([
    ["medicare-advantage", "Medicare Advantage (Part C)"],
    ["supplement", "Medicare Supplement (Medigap)"],
    ["part-d", "Prescription drug coverage (Part D)"],
    ["life", "Life insurance"],
    ["other", "Something else"],
  ])("renders the human label for %s", async (value, label) => {
    await sendLeadNotification({ ...lead, interest: value });
    expect(sentBody()).toContain(`Interested in:       ${label}`);
    expect(sentHtml()).toContain(label);
  });

  it("falls back to the raw value for an unmapped interest", async () => {
    await sendLeadNotification({ ...lead, interest: "dental" });
    expect(sentBody()).toContain("Interested in:       dental");
  });

  it("marks a lead that left no message", async () => {
    await sendLeadNotification({ ...lead, message: undefined });
    expect(sentBody()).toContain("Message:\n(no message)");
    expect(sentHtml()).toContain("(no message)");
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
    expect(sentBody()).toContain(
      "Thank you for reaching out to Caller Agency.",
    );
  });

  it("falls back to BUSINESS_NAME", async () => {
    vi.stubEnv("BUSINESS_NAME", "Env Agency");
    await sendLeadConfirmation(lead);
    expect(sentSubject().Data).toBe("We got your request — Env Agency");
  });

  it("falls back again to a generic name", async () => {
    await sendLeadConfirmation(lead);
    expect(sentSubject().Data).toBe(
      "We got your request — Legacy Benefits Group",
    );
    expect(sentBody()).toContain(
      "Thank you for reaching out to Legacy Benefits Group.",
    );
  });

  it("prefers the phone passed in and pairs it with the TTY number", async () => {
    vi.stubEnv("BUSINESS_PHONE", "612-555-0000");

    await sendLeadConfirmation(lead, { phone: "612-555-9999" });

    expect(sentBody()).toContain(
      "Need help sooner? Call 612-555-9999 (TTY 711) and ask for Nate.",
    );
  });

  it("falls back to BUSINESS_PHONE", async () => {
    vi.stubEnv("BUSINESS_PHONE", "612-555-0000");
    await sendLeadConfirmation(lead);
    expect(sentBody()).toContain(
      "Call 612-555-0000 (TTY 711) and ask for Nate.",
    );
  });

  it("omits the call line entirely when no phone is known", async () => {
    await sendLeadConfirmation(lead);
    expect(sentBody()).not.toContain("Need help sooner");
  });

  it("tells the visitor how to get their details removed", async () => {
    await sendLeadConfirmation(lead);
    expect(sentBody()).toContain(
      "If you did not fill in a form on our website, reply to this message and we will remove your details.",
    );
  });

  it("names Nate and spells enroll the American way", async () => {
    await sendLeadConfirmation(lead);
    const body = sentBody();
    expect(body).toContain("Nate Best, CMIP®, will call you soon.");
    expect(body).toContain("no obligation to enroll in anything");
    expect(body).not.toContain("enrol ");
  });

  it("signs off with Nate's signature and both of its notices", async () => {
    await sendLeadConfirmation(lead, { phone: "(651) 260-1003" });
    const body = sentBody();

    expect(body).toContain(
      [
        "Nate Best, CMIP®",
        "Certified Medicare Insurance Planner™",
        "Legacy Benefits Group, LLC.",
        "651-260-1003",
        "Nbest@legacybenefitsmn.com",
        "",
        "We do not offer every plan available in your area. Any information we provide is limited to those plans we do offer in your area. Please contact Medicare.gov or 1-800-MEDICARE to get information on all your options.",
        "",
        "Certified Medicare Insurance Planner™, DBA, authorizes the use of its trademarks CMIP®",
      ].join("\n"),
    );
    expect(body).toContain("which includes the CMIP® designation.");
  });

  it("styles the signature like Nate's own: bold name, italic title, grey italic notices", async () => {
    await sendLeadConfirmation(lead, { phone: "(651) 260-1003" });
    const html = sentHtml();

    expect(html).toContain("<b>Nate Best, CMIP®</b>");
    expect(html).toContain("<i>Certified Medicare Insurance Planner™</i>");
    expect(html).toContain('href="tel:+16512601003"');
    expect(html).toContain('href="mailto:Nbest@legacybenefitsmn.com"');
    expect(html).toContain(
      '<a href="https://www.medicare.gov/" style="color:#2a85e8;">Medicare.gov</a>',
    );
    expect(html).toContain('<b style="color:#000000;">1-800-MEDICARE</b>');
    expect(html.match(/font-style:italic;color:#8a8a8a;/g)).toHaveLength(2);
    expect(sentCommand().Content.Simple.Body.Html?.Charset).toBe("UTF-8");
  });

  it("keeps a phone that is not ten digits as given in the signature", async () => {
    await sendLeadConfirmation(lead, { phone: "555-0100" });
    expect(sentBody()).toContain("Legacy Benefits Group, LLC.\n555-0100\n");
  });

  it("sets the message body at 18px for easier reading", async () => {
    await sendLeadConfirmation(lead);
    expect(sentHtml()).toContain("font-size:18px");
  });

  it("escapes a visitor's name in the HTML greeting", async () => {
    await sendLeadConfirmation({ ...lead, name: "<b>Eve</b> Smith" });
    expect(sentHtml()).toContain("Hi &lt;b&gt;Eve&lt;/b&gt;,");
  });
});
