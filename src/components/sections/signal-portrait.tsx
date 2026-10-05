"use client";

import { Image } from "@/components/ui/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef } from "react";
import { useVisualEffectLifecycle } from "@/components/motion/use-visual-effect-lifecycle";
import { Button } from "@/components/ui/button";
import { Magnetic } from "@/components/motion/magnetic";
import { PhoneLink } from "@/components/ui/phone-link";
import { Container, Section } from "@/components/ui/section";
import { media } from "@/content/media";
import { team } from "@/content/team";
import { mediaProps } from "@/lib/media";

const photo = mediaProps(media["nate.withDaughter"]);
const beam = media["signal.loop"];
const beamMobile = media["signal.loopMobile"];
const beamPoster = media["signal.poster"];

const reportUnlessAborted = (error: unknown) => {
  if (error instanceof DOMException && error.name === "AbortError") return;
  reportError(error);
};
const [owner] = team;

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
  const beamRef = useRef<HTMLVideoElement>(null);
  const { mounted, reduced, paused, onscreen, tabVisible, finePointer } =
    useVisualEffectLifecycle(frameRef);
  const moving = mounted && !reduced && !paused;
  const running = moving && tabVisible;
  const showBeam = mounted && !reduced;
  const beamPlaying = running && onscreen;

  useEffect(() => {
    const video = beamRef.current;
    if (!video) return;
    if (beamPlaying) video.play().catch(reportUnlessAborted);
    else video.pause();
  }, [showBeam, beamPlaying]);

  const { scrollYProgress: reveal } = useScroll({
    target: frameRef,
    offset: ["start 0.8", "end 0.9"],
  });
  const { scrollYProgress: pass } = useScroll({
    target: frameRef,
    offset: ["start end", "end start"],
  });
  const clipPath = useTransform(
    reveal,
    [0, 1],
    ["circle(14% at 48% 35%)", "circle(100% at 48% 35%)"],
  );
  const filter = useTransform(
    reveal,
    [0, 1],
    ["saturate(0.35) brightness(0.7)", "saturate(1) brightness(1)"],
  );
  const scale = useTransform(reveal, [0, 1], [1.3, 1.08]);
  const y = useTransform(pass, [0, 1], ["-3%", "3%"]);
  const haloOpacity = useTransform(reveal, [0, 1], [0.15, 1]);
  const haloScale = useTransform(reveal, [0, 1], [0.6, 1]);

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
      <div
        aria-hidden
        data-signal-beam=""
        className="absolute inset-x-0 top-0 -z-10 h-[150vw] [mask-image:linear-gradient(to_bottom,#000_65%,transparent)] md:inset-y-0 md:h-auto md:[mask-image:linear-gradient(to_right,transparent_30%,#000_55%)] print:hidden"
      >
        <Image
          data-signal-beam-still=""
          src={beamPoster.src}
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-[72%_50%] md:object-center"
        />
        {showBeam ? (
          <video
            ref={beamRef}
            data-signal-beam-video=""
            muted
            loop
            playsInline
            preload="none"
            className="absolute inset-0 h-full w-full object-cover"
          >
            <source
              media="(max-width: 767px)"
              src={beamMobile.src}
              type="video/mp4"
            />
            <source src={beam.src} type="video/mp4" />
          </video>
        ) : null}
      </div>
      <div aria-hidden className="signal-glow absolute inset-0 -z-10" />
      <Container className="relative grid items-center gap-14 md:grid-cols-2 md:gap-16">
        <div
          ref={frameRef}
          data-signal-frame=""
          className="relative isolate mx-auto w-full max-w-[560px] px-3 md:order-2"
        >
          <motion.div
            aria-hidden
            data-signal-halo=""
            style={
              moving ? { opacity: haloOpacity, scale: haloScale } : undefined
            }
            className="signal-halo pointer-events-none absolute -inset-[16%] -z-10 print:hidden"
          />
          <div className="ring-star-gold outline-star-gold/45 bg-ground-black relative aspect-[4/5] overflow-hidden rounded-2xl shadow-[0_2.5rem_5rem_-1.5rem_rgb(0_0_0/0.7)] ring-2 outline-1 outline-offset-[10px] outline-solid">
            {photo ? (
              <motion.div
                key={moving ? "moving" : "still"}
                data-signal-photo=""
                style={moving ? { clipPath, filter, scale, y } : undefined}
                className="absolute inset-0 print:transform-none! print:[filter:none]! print:[clip-path:none]!"
              >
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  width={photo.width}
                  height={photo.height}
                  sizes="(min-width: 768px) 560px, 100vw"
                  className="h-full w-full object-cover"
                />
              </motion.div>
            ) : null}
          </div>
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
          <Magnetic>
            <Button asChild size="lg">
              <Link href="/contact">{ctaLabel}</Link>
            </Button>
          </Magnetic>
        </div>
      </Container>
    </Section>
  );
}
