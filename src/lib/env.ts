/**
 * Reads an environment variable, treating blank as absent.
 *
 * `process.env.X ?? fallback` is wrong for env vars: `??` only falls back on
 * null or undefined, and an unset key in a .env file is the empty string, not
 * undefined. Since .env.example ships every variable blank, `??` would hand
 * back "" instead of the intended default — which is how the owner's email
 * ended up empty rather than falling back to the business address.
 */
export function env(name: string): string | undefined {
  const value = process.env[name];
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/** First non-blank environment variable from the list, else undefined. */
export function envAny(...names: string[]): string | undefined {
  for (const name of names) {
    const value = env(name);
    if (value !== undefined) return value;
  }
  return undefined;
}
