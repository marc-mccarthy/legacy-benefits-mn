/**
 * Phone canonicalisation for suppression matching.
 *
 * Deliberately free of any database or server imports so the validation
 * schemas — which client components import — can share the exact rule the
 * storage layer applies. Keeping one copy is the point: this module exists
 * because storage and lookup previously each had their own version of "the
 * digits of a phone number" and drifted, so opting out as "+1 612-555-0199"
 * left "612-555-0199" contactable.
 */

/** NANP subscriber number length. Anything shorter cannot identify a person. */
export const PHONE_MIN_DIGITS = 10;

/**
 * The one canonical form of a phone number: its last ten digits, or undefined
 * if there are not enough digits to identify anyone.
 *
 * Digits-only means formatting cannot defeat suppression, and taking the last
 * ten means a country code cannot either.
 *
 * A foreign number whose last ten digits collide with a domestic one
 * over-suppresses rather than under-suppresses.
 */
export function normalizePhone(phone?: string): string | undefined {
  const digits = phone?.replace(/\D/g, "");
  return digits && digits.length >= PHONE_MIN_DIGITS
    ? digits.slice(-PHONE_MIN_DIGITS)
    : undefined;
}

/** Whether a submitted number can be stored as a suppression entry at all. */
export function isSuppressiblePhone(phone: string): boolean {
  return normalizePhone(phone) !== undefined;
}
