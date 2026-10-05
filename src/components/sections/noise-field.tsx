"use client";

import {
  motion,
  useInView,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useRef, type CSSProperties } from "react";

import { Image } from "@/components/ui/image";
import { media } from "@/content/media";

type Piece = {
  paper: "01" | "02" | "06" | "08" | "09" | "10";
  at: [x: string, y: string, w: string];
  mobile: [x: string, y: string, w: string];
  turn: [from: number, to: number];
  tumble: number;
  depth: number;
  far?: boolean;
};

export const PIECES: Piece[] = [
  {
    paper: "09",
    at: ["88%", "-6%", "9vw"],
    mobile: ["70%", "-2%", "24vw"],
    turn: [-30, 40],
    tumble: 50,
    depth: 0.35,
    far: true,
  },
  {
    paper: "01",
    at: ["66%", "70%", "8vw"],
    mobile: ["4%", "93%", "22vw"],
    turn: [20, -35],
    tumble: 40,
    depth: 0.4,
    far: true,
  },
  {
    paper: "10",
    at: ["40%", "-4%", "7vw"],
    mobile: ["40%", "-6%", "18vw"],
    turn: [10, 80],
    tumble: 60,
    depth: 0.45,
    far: true,
  },
  {
    paper: "06",
    at: ["94%", "48%", "10vw"],
    mobile: ["82%", "60%", "26vw"],
    turn: [-15, 55],
    tumble: 45,
    depth: 0.5,
    far: true,
  },
  {
    paper: "02",
    at: ["70%", "8%", "15vw"],
    mobile: ["54%", "70%", "34vw"],
    turn: [-12, 18],
    tumble: 30,
    depth: 0.8,
  },
  {
    paper: "08",
    at: ["48%", "56%", "13vw"],
    mobile: ["-6%", "68%", "36vw"],
    turn: [14, -22],
    tumble: 35,
    depth: 0.9,
  },
  {
    paper: "06",
    at: ["80%", "34%", "16vw"],
    mobile: ["66%", "86%", "38vw"],
    turn: [8, -40],
    tumble: 40,
    depth: 1,
  },
  {
    paper: "10",
    at: ["58%", "28%", "11vw"],
    mobile: ["28%", "80%", "26vw"],
    turn: [-20, 60],
    tumble: 55,
    depth: 1.05,
  },
  {
    paper: "01",
    at: ["30%", "82%", "19vw"],
    mobile: ["22%", "102%", "44vw"],
    turn: [-8, 14],
    tumble: 25,
    depth: 1.2,
  },
  {
    paper: "09",
    at: ["84%", "74%", "20vw"],
    mobile: ["74%", "106%", "40vw"],
    turn: [12, -24],
    tumble: 30,
    depth: 1.35,
  },
  {
    paper: "02",
    at: ["-4%", "88%", "16vw"],
    mobile: ["-14%", "-12%", "40vw"],
    turn: [6, -16],
    tumble: 28,
    depth: 1.5,
  },
  {
    paper: "08",
    at: ["60%", "-16%", "22vw"],
    mobile: ["86%", "18%", "34vw"],
    turn: [-10, 26],
    tumble: 32,
    depth: 1.6,
  },
];

const TRAVEL = 280;

export function NoiseField() {
  const ref = useRef<HTMLDivElement>(null);
  const active = useInView(ref, { margin: "20% 0px" });
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  return (
    <div
      ref={ref}
      aria-hidden
      data-noise-field=""
      data-active={active ? "" : undefined}
      className="pointer-events-none absolute inset-0"
    >
      {PIECES.map((piece, index) => (
        <NoisePiece
          key={index}
          piece={piece}
          index={index}
          progress={scrollYProgress}
        />
      ))}
    </div>
  );
}

function NoisePiece({
  piece,
  index,
  progress,
}: {
  piece: Piece;
  index: number;
  progress: MotionValue<number>;
}) {
  const asset = media[`noise.paper${piece.paper}`];
  const lift = piece.depth * TRAVEL;
  const sway = (index % 2 === 0 ? 1 : -1) * piece.depth * 36;
  const y = useTransform(progress, [0, 1], [lift, -lift]);
  const x = useTransform(progress, [0, 1], [-sway, sway]);
  const rotate = useTransform(progress, [0, 1], piece.turn);
  const rotateX = useTransform(progress, [0, 1], [piece.tumble, -piece.tumble]);
  const rotateY = useTransform(
    progress,
    [0, 1],
    [-piece.tumble / 2, piece.tumble / 2],
  );

  const place = {
    "--x": piece.at[0],
    "--y": piece.at[1],
    "--w": piece.at[2],
    "--mx": piece.mobile[0],
    "--my": piece.mobile[1],
    "--mw": piece.mobile[2],
    "--float-s": `${7 + (index % 5) * 1.3}s`,
    "--float-d": `${-index * 1.7}s`,
  } as CSSProperties;

  return (
    <motion.div
      data-noise-piece={piece.far ? "far" : "near"}
      style={{
        ...place,
        x,
        y,
        rotate,
        rotateX,
        rotateY,
        transformPerspective: 1000,
      }}
    >
      <picture>
        <source type="image/webp" srcSet={asset.srcSet[0]?.src} />
        <Image
          data-noise-shape={`paper-${piece.paper}`}
          src={asset.src}
          alt=""
          aria-hidden
          width={asset.width}
          height={asset.height}
          unoptimized
        />
      </picture>
    </motion.div>
  );
}
