export function fresh(path: string): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}t=${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
