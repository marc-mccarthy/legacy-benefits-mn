function phoneDigits(value: string): string {
  return value.replace(/\D/g, "").replace(/^1/, "").slice(0, 10);
}

export function formatUsPhone(value: string): string {
  const digits = phoneDigits(value);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function caretInFormatted(
  raw: string,
  caret: number,
  formatted: string,
): number {
  const before = raw.slice(0, caret).replace(/\D/g, "");
  const leadingOne = /^1/.test(raw.replace(/\D/g, "")) ? 1 : 0;
  const target = Math.min(Math.max(before.length - leadingOne, 0), 10);
  if (target === 0) return formatted.length > 0 ? 1 : 0;

  let seen = 0;
  for (let i = 0; i < formatted.length; i += 1) {
    if (/\d/.test(formatted[i]!)) seen += 1;
    if (seen === target) return i + 1;
  }
  return formatted.length;
}
