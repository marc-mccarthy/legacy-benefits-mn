"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { Reveal } from "@/components/motion/reveal";
import { useVisualEffectLifecycle } from "@/components/motion/use-visual-effect-lifecycle";
import { Container } from "@/components/ui/section";
import { media } from "@/content/media";
import { cn } from "@/lib/utils";

const dusk = media["lake.dusk"];
const loop = media["band.loop"];
const poster =
  dusk.srcSet.find(({ width, format }) => width === 900 && format === "webp")
    ?.src ?? dusk.src;

const reportUnlessAborted = (error: unknown) => {
  if (error instanceof DOMException && error.name === "AbortError") return;
  reportError(error);
};

export function PageBand({
  title,
  kicker,
  priority = false,
}: {
  title: string;
  kicker?: string;
  priority?: boolean;
}) {
  const bandRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { mounted, reduced, paused, onscreen, tabVisible } =
    useVisualEffectLifecycle(bandRef);
  const showVideo = mounted && !reduced;
  const running = !paused && onscreen && tabVisible;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (running) video.play().catch(reportUnlessAborted);
    else video.pause();
  }, [showVideo, running]);

  return (
    <section
      ref={bandRef}
      data-page-band=""
      data-scheme="dark"
      className="bg-surface text-on-surface relative isolate overflow-clip py-(--spacing-large)"
    >
      <Image
        src={dusk.src}
        alt=""
        aria-hidden
        fill
        priority={priority}
        sizes="100vw"
        className="object-cover object-[50%_55%]"
      />
      {showVideo ? (
        <video
          ref={videoRef}
          data-page-band-video=""
          src={loop.src}
          poster={poster}
          muted
          loop
          playsInline
          preload="none"
          aria-hidden
          className={cn(
            "absolute inset-0 h-full w-full object-cover object-[50%_55%] print:hidden",
            paused && "hidden",
          )}
        />
      ) : null}
      <div
        aria-hidden
        className="from-ground-dark/90 via-ground-dark/60 to-ground-dark/30 absolute inset-0 bg-linear-to-t"
      />
      <Container className="relative">
        <Reveal className="max-w-4xl space-y-4">
          {kicker ? (
            <p className="text-signal-cyan text-base font-semibold tracking-wide uppercase">
              {kicker}
            </p>
          ) : null}
          <h1 className="font-display text-(length:--text-display-page) leading-[1.05] font-bold tracking-[-0.04em] text-balance text-white [font-stretch:112%]">
            {title}
          </h1>
        </Reveal>
      </Container>
    </section>
  );
}
