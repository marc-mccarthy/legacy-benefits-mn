import { z } from "zod";

/** Validation only — safe to import from a client component. */
export const dncInputSchema = z
  .object({
    email: z
      .union([z.literal(""), z.email("Please enter a valid email address")])
      .optional(),
    phone: z.union([z.literal(""), z.string().trim().max(40)]).optional(),
    requestType: z.enum(["revoke-contact", "do-not-sell", "delete-my-data"]),
    notes: z.union([z.literal(""), z.string().trim().max(2000)]).optional(),
  })
  .refine((v) => Boolean(v.email?.trim() || v.phone?.trim()), {
    message: "Enter the email address or phone number to suppress",
    path: ["email"],
  });

export type DncInput = z.infer<typeof dncInputSchema>;
