"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const OPTIONS: { value?: string; label: string }[] = [
  { value: undefined, label: "All" },
  { value: "article", label: "Articles" },
  { value: "tool", label: "Tools" },
  { value: "video", label: "Videos" },
];

const VALUES = new Set(
  OPTIONS.map((option) => option.value).filter(Boolean) as string[],
);

export function LearningFilter({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const params = useSearchParams();

  const requested = params.get("type") ?? undefined;
  const active = requested && VALUES.has(requested) ? requested : undefined;

  const hrefFor = (value?: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set("type", value);
    else next.delete("type");

    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  return (
    <div data-learning-filter={active ?? "all"}>
      <nav aria-label="Filter resources by type" className="mb-6">
        <ul className="flex flex-wrap gap-2">
          {OPTIONS.map((option) => {
            const isActive = active === option.value;
            return (
              <li key={option.label}>
                <Link
                  href={hrefFor(option.value)}
                  replace
                  scroll={false}
                  aria-current={isActive ? "page" : undefined}
                  className={
                    isActive
                      ? "bg-on-surface text-surface inline-flex min-h-11 items-center rounded-full px-5 text-base font-semibold"
                      : "border-border-subtle inline-flex min-h-11 items-center rounded-full border px-5 text-base font-semibold"
                  }
                >
                  {option.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {children}
    </div>
  );
}
