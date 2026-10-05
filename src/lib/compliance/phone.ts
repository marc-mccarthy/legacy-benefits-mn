export const PHONE_MIN_DIGITS = 10;

export function normalizePhone(phone?: string): string | undefined {
  const digits = phone?.replace(/\D/g, "");
  return digits && digits.length >= PHONE_MIN_DIGITS
    ? digits.slice(-PHONE_MIN_DIGITS)
    : undefined;
}

export function isSuppressiblePhone(phone: string): boolean {
  return normalizePhone(phone) !== undefined;
}
