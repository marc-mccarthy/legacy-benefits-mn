export function env(name: string): string | undefined {
  const value = process.env[name];
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export function envAny(...names: string[]): string | undefined {
  for (const name of names) {
    const value = env(name);
    if (value !== undefined) return value;
  }
  return undefined;
}
