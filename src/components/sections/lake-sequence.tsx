"use client";

import { Image } from "@/components/ui/image";
import { type MotionValue, useInView, useScroll } from "motion/react";
import { type RefObject, useEffect, useRef, useSyncExternalStore } from "react";
import { useVisualEffectLifecycle } from "@/components/motion/use-visual-effect-lifecycle";
import { Container, Section } from "@/components/ui/section";
import { media } from "@/content/media";
import { cn } from "@/lib/utils";

const PHONE_QUERY = "(max-width: 699px)";

const dusk = media["lake.dusk"];
const loop = media["lake.loop"];
const scrub = media["lake.scrub"];
const scrubPoster = media["lake.scrubPoster"];
const phonePoster =
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

function useScrubbedVideo(
  videoRef: RefObject<HTMLVideoElement | null>,
  progress: MotionValue<number>,
  active: boolean,
) {
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !active) return;
    let frame = 0;

    const seek = () => {
      frame = 0;
      if (!video.duration) return;
      if (video.seeking) {
        frame = requestAnimationFrame(seek);
        return;
      }
      const target = Math.min(
        video.duration - 0.05,
        Math.max(0, progress.get() * video.duration),
      );
      if (Math.abs(video.currentTime - target) > 1 / 60) {
        video.currentTime = target;
      }
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(seek);
    };

    const stop = progress.on("change", schedule);
    video.addEventListener("loadedmetadata", schedule);
    schedule();
    return () => {
      stop();
      video.removeEventListener("loadedmetadata", schedule);
      cancelAnimationFrame(frame);
    };
  }, [videoRef, progress, active]);
}

export function LakeSequence({
  heading,
  body,
}: {
  heading: string;
  body: string;
}) {
  const trackRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const loopRef = useRef<HTMLVideoElement>(null);
  const scrubRef = useRef<HTMLVideoElement>(null);
  const { mounted, reduced, paused, onscreen, tabVisible } =
    useVisualEffectLifecycle(frameRef);
  const near = useInView(trackRef, { once: true, margin: "100% 0px" });
  const phone = useSyncExternalStore(subscribePhone, getPhone, () => false);
  const moving = mounted && !reduced;
  const showLoop = moving && phone;
  const showScrub = moving && !phone && near;
  const running = !paused && onscreen && tabVisible;
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });

  useScrubbedVideo(scrubRef, scrollYProgress, showScrub && !paused);

  useEffect(() => {
    const video = loopRef.current;
    if (!video) return;
    if (running) video.play().catch(reportUnlessAborted);
    else video.pause();
  }, [showLoop, running]);

  return (
    <Section
      ref={trackRef}
      scheme="black"
      data-lake-track=""
      data-stage=""
      aria-labelledby="lake-heading"
      className="relative h-[150svh] py-0 md:h-[300svh] md:py-0 print:h-auto"
    >
      <div ref={frameRef} className="sticky top-0 h-svh overflow-clip">
        <picture>
          <source media="(min-width: 700px)" srcSet={scrubPoster.src} />
          <Image
            data-lake-still=""
            src={dusk.src}
            alt=""
            aria-hidden
            fill
            sizes="100vw"
            className="object-cover"
          />
        </picture>
        {showScrub ? (
          <video
            ref={scrubRef}
            data-lake-scrub=""
            src={scrub.src}
            poster={scrubPoster.src}
            muted
            playsInline
            preload="metadata"
            aria-hidden
            className={cn(
              "absolute inset-0 h-full w-full object-cover print:hidden",
              paused && "hidden",
            )}
          />
        ) : null}
        {showLoop ? (
          <video
            ref={loopRef}
            data-lake-video=""
            src={loop.src}
            poster={phonePoster}
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
