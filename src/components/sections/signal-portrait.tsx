"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useVisualEffectLifecycle } from "@/components/motion/use-visual-effect-lifecycle";
import { Button } from "@/components/ui/button";
import { PhoneLink } from "@/components/ui/phone-link";
import { Container, Section } from "@/components/ui/section";
import { media } from "@/content/media";
import { team } from "@/content/team";
import { mediaProps } from "@/lib/media";

const colour = mediaProps(media["team.owner"]);
const duotone = mediaProps(media["nate.duotone"]);
const [owner] = team;

const LAYER =
  "portrait-feather absolute inset-0 h-full w-full object-contain object-bottom";

export function SignalPortrait({
  heading,
  ctaLabel,
  phone,
}: {
  heading: string;
  ctaLabel: string;
  phone?: string | null;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const { mounted, reduced, paused, tabVisible, finePointer } =
    useVisualEffectLifecycle(frameRef);
  const running = mounted && !reduced && !paused && tabVisible;

  useEffect(() => {
    const section = frameRef.current?.closest<HTMLElement>("[data-signal]");
    if (!section || !running || !finePointer) return;
    const onMove = (event: PointerEvent) => {
      const box = section.getBoundingClientRect();
      section.style.setProperty("--mx", `${event.clientX - box.left}px`);
      section.style.setProperty("--my", `${event.clientY - box.top}px`);
      section.setAttribute("data-light", "");
    };
    section.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      section.removeEventListener("pointermove", onMove);
      section.removeAttribute("data-light");
      section.style.removeProperty("--mx");
      section.style.removeProperty("--my");
    };
  }, [running, finePointer]);

  return (
    <Section
      scheme="dark"
      data-signal=""
      className="relative isolate overflow-clip"
    >
      <div aria-hidden className="signal-glow absolute inset-0 -z-10" />
      <Container className="relative grid items-end gap-10 md:grid-cols-2 md:gap-16">
        <div
          ref={frameRef}
          data-signal-frame=""
          className="relative mx-auto aspect-[651/1229] w-full max-w-[600px] md:order-2"
        >
          {duotone ? (
            <Image
              data-signal-duotone=""
              src={duotone.src}
              alt=""
              aria-hidden
              width={duotone.width}
              height={duotone.height}
              sizes="(min-width: 768px) 600px, 100vw"
              className={LAYER}
            />
          ) : null}
          {colour ? (
            <Image
              data-signal-colour=""
              src={colour.src}
              alt={colour.alt}
              width={colour.width}
              height={colour.height}
              sizes="(min-width: 768px) 600px, 100vw"
              className={LAYER}
            />
          ) : null}
        </div>

        <div className="relative z-10 flex flex-col items-start gap-6 pb-4 md:order-1">
          <h2 className="text-(length:--text-display-page) leading-[1.05] font-semibold tracking-[-0.01em] text-balance text-white">
            {heading}
          </h2>
          <p className="lead max-w-xl text-white">{owner.bio}</p>
          <p className="max-w-xl text-white">
            {owner.licenses.slice(0, 2).join(" - ")}
          </p>
          {phone ? (
            <div>
              <p className="text-muted">Call Nate directly</p>
              <PhoneLink
                phone={phone}
                className="text-star-gold text-(length:--text-display-lg)"
              />
            </div>
          ) : null}
          <Button asChild size="lg">
            <Link href="/contact">{ctaLabel}</Link>
          </Button>
        </div>
      </Container>
    </Section>
  );
}
