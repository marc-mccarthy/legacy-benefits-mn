import Image from "next/image";
import { CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/card";
import { Morph } from "@/components/motion/morph";
import { mediaProps } from "@/lib/media";

export function EventImage({
  image,
  cost,
  morphSlug,
}: {
  image?: unknown;
  cost: "free" | "paid";
  morphSlug?: string;
}) {
  const photo = mediaProps(image as never);

  const picture = photo ? (
    <Image
      src={photo.src}
      alt={photo.alt}
      fill
      sizes="(min-width: 768px) 33vw, 100vw"
      className="object-cover"
    />
  ) : null;

  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden">
      {picture ? (
        morphSlug ? (
          <Morph kind="event" slug={morphSlug}>
            {picture}
          </Morph>
        ) : (
          picture
        )
      ) : (
        <div
          aria-hidden
          className="bg-night-900 text-paper/40 grid size-full place-items-center"
        >
          <CalendarDays className="size-10" />
        </div>
      )}
      <div className="absolute top-3 left-3">
        <Badge>{cost === "free" ? "Free" : "Paid"}</Badge>
      </div>
    </div>
  );
}
