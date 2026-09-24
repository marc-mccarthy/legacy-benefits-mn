/**
 * Appends a unique query parameter so a navigation is served fresh.
 *
 * The query is ignored by the static server and by every route, so it changes
 * only whether the browser and the router may answer from a cache.
 */
export function fresh(path: string): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}t=${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
