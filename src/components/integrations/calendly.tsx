"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

/**
 * Calendly inline embed, matching greatwatersfinancial.com.
 *
 * Loaded lazily and given an accessible name, because the widget renders into
 * an iframe that is otherwise unlabelled for screen readers.
 */
export function CalendlyInline({
  url,
  title = "Schedule a call with a licensed agent",
}: {
  url: string;
  title?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.setAttribute("data-url", url);
  }, [url]);

  if (!url) return null;

  return (
    <>
      <div
        ref={ref}
        className="calendly-inline-widget min-h-[42rem] w-full overflow-hidden rounded-(--radius-card)"
        data-url={url}
        role="region"
        aria-label={title}
      />
      <Script
        src="https://assets.calendly.com/assets/external/widget.js"
        strategy="lazyOnload"
      />
      <noscript>
        <p>
          <a href={url}>Open the scheduling page</a> to book a call.
        </p>
      </noscript>
    </>
  );
}
