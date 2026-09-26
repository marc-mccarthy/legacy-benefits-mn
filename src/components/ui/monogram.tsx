import { cn } from "@/lib/utils";

/** First and last initial. "Nate Van Der Berg" gives NV, not NVDB. */
export function initialsOf(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((p) => /\p{L}/u.test(p));
  if (parts.length === 0) return "?";
  const first = parts[0];
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  // [...str][0] takes a full code point, so an astral character is not sliced.
  return (([...first][0] ?? "") + ([...last][0] ?? "")).toUpperCase();
}

export function Monogram({
  name,
  className,
  textClassName = "text-lg",
}: {
  name: string;
  className?: string;
  textClassName?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "bg-night-900 text-paper grid shrink-0 place-items-center font-semibold",
        className,
      )}
    >
      <span className={cn("tracking-wide", textClassName)}>
        {initialsOf(name)}
      </span>
    </span>
  );
}
