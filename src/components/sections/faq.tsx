"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { Container, Section, type Scheme } from "@/components/ui/section";

export type FaqItem = { question: string; answer: ReactNode };

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
              <Accordion.Content
                data-faq-panel
                className="text-muted leading-relaxed"
              >
                <div className="pb-5">{item.answer}</div>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </Container>
    </Section>
  );
}
