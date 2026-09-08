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
  /** Typed signature. CMS accepts an electronic signature for a remote SOA. */
  signature: z.string().trim().min(2, "Please type your name to sign").max(160),
  appointmentAt: z.string().optional(),
});

export type SoaInput = z.infer<typeof soaInputSchema>;
