import { z } from "zod";

const optionalText = <T extends z.ZodType<string, string>>(inner: T) =>
  z.union([z.literal(""), inner]).optional();

export const leadInputSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(120),
  email: z.email("Please enter a valid email address").max(200),
  phone: z
    .string()
    .trim()
    .max(40)
    .refine(
      (value) => value.replace(/\D/g, "").replace(/^1/, "").length === 10,
      "Please enter a 10-digit phone number",
    ),
  zip: z
    .string()
    .trim()
    .regex(/^\d{5}(-\d{4})?$/, "Please enter a 5-digit ZIP code"),
  interest: z.enum(
    ["medicare-advantage", "supplement", "part-d", "life", "other"],
    { error: "Please choose what we can help with" },
  ),
  message: optionalText(z.string().trim().max(4000)),
  consent: z
    .boolean()
    .refine((v) => v === true, "Please agree to be contacted"),
  sourcePath: optionalText(z.string().max(300)),
  utm: z.record(z.string(), z.string()).optional(),
  company: z.string().optional(),
  turnstileToken: z.string().optional(),
});

export type LeadInput = z.infer<typeof leadInputSchema>;

export function blankToUndefined(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
