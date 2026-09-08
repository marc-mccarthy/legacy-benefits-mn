import { z } from "zod";

/**
 * Optional free-text field.
 *
 * HTML forms submit blanks as "", so the empty string is accepted explicitly
 * rather than being validated against the field's rules — otherwise leaving an
 * optional ZIP blank would fail the ZIP pattern. Blanks are converted to
 * undefined in the service layer (see blankToUndefined), which keeps the
 * inferred keys optional and the react-hook-form resolver happy.
 */
const optionalText = <T extends z.ZodType<string, string>>(inner: T) =>
  z.union([z.literal(""), inner]).optional();

export const leadInputSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(120),
  email: z.email("Please enter a valid email address").max(200),
  phone: optionalText(z.string().trim().max(40)),
  zip: optionalText(
    z
      .string()
      .trim()
      .regex(/^\d{5}(-\d{4})?$/, "Please enter a valid ZIP code"),
  ),
  // The select's placeholder option submits "", which must be treated as
  // "not chosen" rather than an invalid enum value — otherwise leaving the
  // dropdown alone blocks the whole form.
  interest: z
    .union([
      z.literal(""),
      z.enum(["medicare-advantage", "supplement", "part-d", "life", "other"]),
    ])
    .optional(),
  message: optionalText(z.string().trim().max(4000)),
  consent: z
    .boolean()
    .refine((v) => v === true, "Please agree to be contacted"),
  sourcePath: optionalText(z.string().max(300)),
  utm: z.record(z.string(), z.string()).optional(),
  // Honeypot: bots fill hidden fields, humans never see them. Deliberately
  // permissive — rejecting here would return a validation error naming the
  // trap, which tells a bot exactly which field to leave blank next time.
  // The route accepts these silently instead. See /api/leads.
  company: z.string().optional(),
  turnstileToken: z.string().optional(),
});

export type LeadInput = z.infer<typeof leadInputSchema>;

/** "" and whitespace-only become undefined, so blanks are stored as NULL. */
export function blankToUndefined(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
