"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { Container, Section, type Scheme } from "@/components/ui/section";

export type FaqItem = { question: string; answer: ReactNode };

/**
 * Accordion FAQ. Radix handles the roving focus and aria-expanded wiring that
 * hand-rolled accordions almost always get wrong. Items are collapsible and
 * independent, so a visitor can open several at once.
 */
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
          className="text-3xl font-semibold tracking-tight md:text-4xl"
        >
          {heading ?? "Common questions"}
        </h2>

        <Accordion.Root
          type="multiple"
          className="divide-border-subtle divide-y border-y"
        >
          {items.map((item, i) => (
            <Accordion.Item key={i} value={`item-${i}`}>
              <Accordion.Header>
                <Accordion.Trigger className="group flex w-full items-center justify-between gap-4 py-5 text-left text-lg font-semibold">
                  {item.question}
                  <ChevronDown
                    aria-hidden
                    className="size-5 shrink-0 transition-transform group-data-[state=open]:rotate-180"
                  />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="text-muted pb-5 leading-relaxed">
                {item.answer}
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </Container>
    </Section>
  );
}
