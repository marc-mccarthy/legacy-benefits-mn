export function paletteColor(token: string): string {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim();
  if (!value) throw new Error(`palette: ${token} is not set`);
  return value;
}
