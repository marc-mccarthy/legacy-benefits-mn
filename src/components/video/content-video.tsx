import { cn } from "@/lib/utils";

export type VideoCaptionCue = {
  readonly start: string;
  readonly end: string;
  readonly text: string;
};

export const CONTENT_VIDEO_CAPTIONS: readonly VideoCaptionCue[] = [
  {
    start: "00:00:00.000",
    end: "00:00:06.000",
    text: "[No sound] From the air: a wide brown river in spring flood, running toward a drop, bare trees and conifers along both banks.",
  },
  {
    start: "00:00:06.000",
    end: "00:00:13.000",
    text: "The view follows the current downstream. Mist rises from the far edge, where the river disappears over the lip.",
  },
  {
    start: "00:00:13.000",
    end: "00:00:20.000",
    text: "Over the brink. White water pours down into a dark rock gorge.",
  },
  {
    start: "00:00:20.000",
    end: "00:00:30.000",
    text: "Looking straight down the falls onto layered dark rock, the water breaking into separate chutes.",
  },
  {
    start: "00:00:30.000",
    end: "00:00:40.000",
    text: "The pool below, brown and white with turbulence, against a broad shelf of bare rock.",
  },
  {
    start: "00:00:40.000",
    end: "00:00:50.000",
    text: "The whole face of the falls: a wide curtain of white water split by a dark rock buttress, cliffs rising on either side.",
  },
  {
    start: "00:00:50.000",
    end: "00:01:00.000",
    text: "Closer on the falling water. Spray fills the lower part of the frame.",
  },
  {
    start: "00:01:00.000",
    end: "00:01:08.000",
    text: "Back above the crest. A flat rock island splits the river into two channels and a rainbow stands in the spray.",
  },
  {
    start: "00:01:08.000",
    end: "00:01:15.000",
    text: "The falls from above and behind, rainbow still in the spray, the river running on into the gorge below.",
  },
];

export function captionsToWebVtt(
  cues: readonly VideoCaptionCue[] = CONTENT_VIDEO_CAPTIONS,
): string {
  const blocks = cues.map((cue) => `${cue.start} --> ${cue.end}\n${cue.text}`);
  return `WEBVTT\n\n${blocks.join("\n\n")}\n`;
}

function cueLabel(start: string): string {
  const [h = "0", m = "0", rest = "0"] = start.split(":");
  const seconds = (rest.split(".")[0] ?? "0").padStart(2, "0");
  const hours = Number(h);
  return hours > 0
    ? `${hours}:${m.padStart(2, "0")}:${seconds}`
    : `${Number(m)}:${seconds}`;
}

type MediaRef =
  | {
      url?: string | null;
      alt?: string | null;
      credit?: string | null;
      mimeType?: string | null;
    }
  | number
  | null
  | undefined;

function resolve(media: MediaRef) {
  if (!media || typeof media === "number") return null;
  if (!media.url) return null;
  return {
    src: media.url,
    alt: media.alt ?? "",
    credit: media.credit ?? "",
    mimeType: media.mimeType ?? "video/mp4",
  };
}

type ContentVideoProps = {
  video: MediaRef;
  poster?: MediaRef;
  captionsSrc: string;
  licenceUrl?: string;
  heading?: string;
  className?: string;
};

export function ContentVideo({
  video,
  poster,
  captionsSrc,
  licenceUrl,
  heading,
  className,
}: ContentVideoProps) {
  const clip = resolve(video);
  if (!clip) return null;

  const still = resolve(poster);

  return (
    <div className={cn("space-y-8", className)}>
      {heading ? (
        <h2 className="font-display text-(length:--text-display-lg)">
          {heading}
        </h2>
      ) : null}

      <figure data-print-hide className="space-y-3">
        <video
          controls
          preload="none"
          playsInline
          poster={still?.src}
          className="aspect-video w-full rounded-(--radius-card)"
        >
          <source src={clip.src} type={clip.mimeType} />
          <track kind="captions" srcLang="en" src={captionsSrc} default />
        </video>

        <figcaption className="text-muted space-y-1 text-base">
          {clip.alt ? <span className="block">{clip.alt}</span> : null}
          {clip.credit ? (
            <span className="block">
              {clip.credit}
              {licenceUrl ? (
                <>
                  {" "}
                  <a
                    href={licenceUrl}
                    rel="license"
                    className="underline underline-offset-4"
                  >
                    Licence terms
                  </a>
                </>
              ) : null}
            </span>
          ) : null}
        </figcaption>
      </figure>

      <div data-transcript className="space-y-3">
        <h3 className="text-lg font-semibold">Transcript</h3>
        <p className="text-muted text-base">
          This clip has no speech and no sound. The captions and the transcript
          below describe what is on screen.
        </p>
        <ol className="space-y-2">
          {CONTENT_VIDEO_CAPTIONS.map((cue) => (
            <li key={cue.start} className="text-base">
              <span className="text-muted tabular">{cueLabel(cue.start)}</span>{" "}
              {cue.text}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
