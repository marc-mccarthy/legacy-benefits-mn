"use client";

import Image from "next/image";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { ThreeStage } from "@/components/motion/three-stage";
import { useVisualEffectLifecycle } from "@/components/motion/use-visual-effect-lifecycle";
import { Container, Section } from "@/components/ui/section";
import { media } from "@/content/media";
import { cn } from "@/lib/utils";

const PHONE_QUERY = "(max-width: 699px)";

const dusk = media["lake.dusk"];
const loop = media["lake.loop"];
const poster =
  dusk.srcSet.find(({ width, format }) => width === 900 && format === "webp")
    ?.src ?? dusk.src;

const subscribePhone = (onChange: () => void) => {
  const query = matchMedia(PHONE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

const getPhone = () => matchMedia(PHONE_QUERY).matches;

const reportUnlessAborted = (error: unknown) => {
  if (error instanceof DOMException && error.name === "AbortError") return;
  reportError(error);
};

export function LakeSequence({
  heading,
  body,
}: {
  heading: string;
  body: string;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { mounted, reduced, paused, onscreen, tabVisible } =
    useVisualEffectLifecycle(frameRef);
  const phone = useSyncExternalStore(subscribePhone, getPhone, () => false);
  const showVideo = phone && mounted && !reduced;
  const running = !paused && onscreen && tabVisible;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (running) video.play().catch(reportUnlessAborted);
    else video.pause();
  }, [showVideo, running]);

  return (
    <Section
      scheme="black"
      data-lake-track=""
      data-stage=""
      aria-labelledby="lake-heading"
      className="relative h-[150svh] py-0 md:h-[200svh] md:py-0 print:h-auto"
    >
      <div ref={frameRef} className="sticky top-0 h-svh overflow-clip">
        <ThreeStage
          scene="lake"
          active={!phone}
          className="absolute inset-0"
          fallback={
            <Image
              data-lake-still=""
              src={dusk.src}
              alt=""
              aria-hidden
              fill
              sizes="100vw"
              className="object-cover"
            />
          }
        />
        {showVideo ? (
          <video
            ref={videoRef}
            data-lake-video=""
            src={loop.src}
            poster={poster}
            muted
            loop
            playsInline
            preload="none"
            aria-hidden
            className={cn(
              "absolute inset-0 h-full w-full object-cover print:hidden",
              paused && "hidden",
            )}
          />
        ) : null}
        <div
          aria-hidden
          data-lake-scrim=""
          className="absolute inset-0 bg-linear-to-t from-black/85 via-black/60 via-55% to-transparent"
        />
        <Container className="absolute inset-x-0 bottom-0 pb-(--spacing-large)">
          <h2
            id="lake-heading"
            className="max-w-4xl text-(length:--text-display-page) leading-[1.05] font-semibold tracking-[-0.01em] text-balance text-white"
          >
            {heading}
          </h2>
          <p className="lead mt-6 max-w-xl text-white">{body}</p>
        </Container>
      </div>
    </Section>
  );
}
