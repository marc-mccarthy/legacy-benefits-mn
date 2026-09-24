import { z } from "zod";
import { SOA_PRODUCT_TYPES } from "./disclosures";

/**
 * Validation only — deliberately free of any database or server imports so a
 * client component can share it without pulling `pg` into the browser bundle.
 */

const productValues = SOA_PRODUCT_TYPES.map((p) => p.value) as [
  string,
  ...string[],
];

export const soaInputSchema = z.object({
  beneficiaryName: z
    .string()
    .trim()
    .min(2, "Please enter your full name")
    .max(160),
  email: z
    .union([z.literal(""), z.email("Please enter a valid email address")])
    .optional(),
  phone: z.string().trim().min(10, "Please enter a phone number").max(40),
  address: z.union([z.literal(""), z.string().trim().max(300)]).optional(),
  productTypes: z
    .array(z.enum(productValues))
    .min(1, "Select at least one product type to discuss"),
  agentName: z.union([z.literal(""), z.string().trim().max(160)]).optional(),
  /** Typed signature. */
  signature: z.string().trim().min(2, "Please type your name to sign").max(160),
  /**
   * When the sales meeting is expected. Only feeds the 48-hour flag recordSoa
   * stores.
   *
   * Validated for parseability rather than for a fixed format: recordSoa feeds
   * this to `new Date()`, and an unparseable string used to become an Invalid
   * Date that Postgres rejected — a 500 with no SOA on file, where the correct
   * answer was a 422 here. Kept permissive about shape so a future
   * `<input type="datetime-local">` ("2026-09-10T14:30", no offset) still
   * passes without another change.
   */
  appointmentAt: z
    .union([
      z.literal(""),
      z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
        message: "Please enter a valid appointment date and time",
      }),
    ])
    .optional(),
});

export type SoaInput = z.infer<typeof soaInputSchema>;
