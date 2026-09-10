import Image from "next/image";
import { CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/card";
import { mediaProps } from "@/lib/media";

/**
 * Photo header for an event card, with the free/paid badge overlaid — the
 * treatment used on greatwatersfinancial.com, where the photo does most of
 * the visual work.
 *
 * Falls back to a brand-coloured panel so a card without a photo still has
 * structure rather than collapsing to plain text.
 */
export function EventImage({
  image,
  cost,
}: {
  image?: unknown;
  cost: "free" | "paid";
}) {
  const photo = mediaProps(image as never);

  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden">
      {photo ? (
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          sizes="(min-width: 768px) 33vw, 100vw"
          className="object-cover"
        />
      ) : (
        <div
          aria-hidden
          className="bg-navy-800 grid size-full place-items-center text-white/40"
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
