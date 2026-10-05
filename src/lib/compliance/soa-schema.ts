import { z } from "zod";
import { SOA_PRODUCT_TYPES } from "./disclosures";

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
  signature: z.string().trim().min(2, "Please type your name to sign").max(160),
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
