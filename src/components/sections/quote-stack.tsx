"use client";

import { Image } from "@/components/ui/image";
import { useEffect, useRef, useState } from "react";
import { Monogram } from "@/components/ui/monogram";

export type StackQuote = {
  id: number | string;
  quote: string;
  author: string;
  location?: string | null;
  photoSrc?: string | null;
};

export function QuoteStack({ items }: { items: StackQuote[] }) {
  const listRef = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const quotes = [...list.children];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(quotes.indexOf(entry.target));
        }
      },
      { rootMargin: "-45% 0px" },
    );
    for (const quote of quotes) observer.observe(quote);
    return () => observer.disconnect();
  }, []);

  return (
    <ol ref={listRef} data-quote-stack="">
      {items.map((item, index) => (
        <li
          key={item.id}
          data-active-quote={index === active ? "true" : undefined}
          style={{ top: `calc(var(--header-stack) + 1rem * ${index})` }}
          className="bg-surface border-border-subtle data-[active-quote=true]:border-star-gold border-l-2 py-(--spacing-medium) pl-6"
        >
          <figure className="flex flex-col gap-6">
            <blockquote>
              <p className="max-w-[28ch] text-(length:--text-display-md) leading-snug text-pretty text-white">
                {`“${item.quote}”`}
              </p>
            </blockquote>
            <figcaption className="flex items-center gap-3 text-base">
              {item.photoSrc ? (
                <Image
                  src={item.photoSrc}
                  alt=""
                  width={48}
                  height={48}
                  className="size-12 rounded-full object-cover"
                />
              ) : (
                <Monogram name={item.author} className="size-12 rounded-full" />
              )}
              <span>
                {item.author}
                {item.location ? ` - ${item.location}` : ""}
              </span>
            </figcaption>
          </figure>
        </li>
      ))}
    </ol>
  );
}
