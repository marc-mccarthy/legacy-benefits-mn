import { z } from "zod";
import { PHONE_MIN_DIGITS, isSuppressiblePhone } from "./phone";

/** Validation only — safe to import from a client component. */
export const dncInputSchema = z
  .object({
    email: z
      .union([z.literal(""), z.email("Please enter a valid email address")])
      .optional(),
    /**
     * Held to the same bar the storage layer applies. Without this the field
     * only had a maximum, so "12345" satisfied the "email or phone" rule
     * below, then normalizePhone discarded it as too short — recording an
     * opt-out with no identifier at all while telling the visitor it worked,
     * and leaving them contactable. Rejecting here gives them something they
     * can correct.
     */
    phone: z
      .union([
        z.literal(""),
        z
          .string()
          .trim()
          .max(40)
          .refine(isSuppressiblePhone, {
            message: `Please enter a phone number with at least ${PHONE_MIN_DIGITS} digits`,
          }),
      ])
      .optional(),
    requestType: z.enum(["revoke-contact", "do-not-sell", "delete-my-data"]),
    notes: z.union([z.literal(""), z.string().trim().max(2000)]).optional(),
  })
  .refine((v) => Boolean(v.email?.trim() || v.phone?.trim()), {
    message: "Enter the email address or phone number to suppress",
    path: ["email"],
  });

export type DncInput = z.infer<typeof dncInputSchema>;
