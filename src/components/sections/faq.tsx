"use client";

import { ChevronDown } from "lucide-react";
import { animate, type AnimationPlaybackControls } from "motion/react";
import { type MouseEvent, type ReactNode, useRef } from "react";
import { Container, Section, type Scheme } from "@/components/ui/section";
import { useEffectsPaused } from "@/lib/effects-pause";
import { DURATION_HOUSE, EASE_MOVE } from "@/lib/motion";

export type FaqItem = { question: string; answer: ReactNode };

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function FaqEntry({ item }: { item: FaqItem }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const running = useRef<AnimationPlaybackControls | null>(null);
  const paused = useEffectsPaused();

  const onToggleClick = (event: MouseEvent<HTMLElement>) => {
    const details = detailsRef.current;
    const panel = panelRef.current;
    if (!details || !panel || paused || matchMedia(REDUCED_QUERY).matches) {
      return;
    }
    event.preventDefault();
    const opening = !details.open || details.hasAttribute("data-faq-closing");
    running.current?.stop();
    if (opening) {
      details.removeAttribute("data-faq-closing");
      if (!details.open) {
        panel.style.height = "0px";
        panel.style.opacity = "0";
        details.open = true;
      }
    } else {
      details.setAttribute("data-faq-closing", "");
    }
    const controls = animate(
      panel,
      opening
        ? { height: `${panel.scrollHeight}px`, opacity: 1 }
        : { height: "0px", opacity: 0 },
      { duration: DURATION_HOUSE / 1000, ease: EASE_MOVE },
    );
    running.current = controls;
    void controls.then(() => {
      if (running.current !== controls) return;
      running.current = null;
      if (!opening) {
        details.open = false;
        details.removeAttribute("data-faq-closing");
      }
      panel.style.removeProperty("height");
      panel.style.removeProperty("opacity");
    });
  };

  return (
    <details ref={detailsRef} data-faq-item="">
      <summary
        onClick={onToggleClick}
        className="flex min-h-11 w-full cursor-pointer list-none items-center justify-between gap-4 py-5 text-left text-lg font-semibold [&::-webkit-details-marker]:hidden"
      >
        {item.question}
        <ChevronDown
          aria-hidden
          data-faq-chevron=""
          className="size-5 shrink-0 transition-transform duration-(--duration-house)"
        />
      </summary>
      <div
        ref={panelRef}
        data-faq-panel=""
        className="text-muted overflow-hidden leading-relaxed"
      >
        <div className="pb-5">{item.answer}</div>
      </div>
    </details>
  );
}

export function Faq({
  heading,
  items,
  scheme = "light",
}: {
  heading?: string | null;
  items: FaqItem[];
  scheme?: Scheme;
}) {
  if (items.length === 0) return null;

  return (
    <Section scheme={scheme} aria-labelledby="faq-heading">
      <Container className="grid gap-10 md:grid-cols-[1fr_2fr]">
        <h2
          id="faq-heading"
          className="font-display text-(length:--text-display-lg)"
        >
          {heading ?? "Common questions"}
        </h2>

        <div className="divide-border-subtle divide-y border-y">
          {items.map((item, i) => (
            <FaqEntry key={i} item={item} />
          ))}
        </div>
      </Container>
    </Section>
  );
}
