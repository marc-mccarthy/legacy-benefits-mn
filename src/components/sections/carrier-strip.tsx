import Image from "next/image";
import { Container, Section, type Scheme } from "@/components/ui/section";
import { mediaProps } from "@/lib/media";

export type Carrier = {
  id: number | string;
  name: string;
  logo?: unknown;
  approved?: boolean | null;
};

/**
 * Carrier trust strip.
 *
 * Only carriers marked `approved` are shown, because carrier co-marketing
 * rules govern how their marks may be displayed. Carriers without an uploaded
 * logo fall back to their name set as a wordmark, which is also the safe
 * default until real logo files are cleared for use.
 */
export function CarrierStrip({
  heading,
  carriers,
  scheme = "light",
}: {
  heading?: string | null;
  carriers: Carrier[];
  scheme?: Scheme;
}) {
  const visible = carriers.filter((c) => c.approved);
  if (visible.length === 0) return null;

  return (
    <Section
      scheme={scheme}
      className="py-(--spacing-medium) md:py-(--spacing-large)"
      aria-labelledby="carriers-heading"
    >
      <Container className="space-y-8">
        <h2
          id="carriers-heading"
          className="text-muted text-center text-sm font-semibold tracking-wider uppercase"
        >
          {heading ?? "We represent"}
        </h2>

        <ul className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
          {visible.map((carrier) => {
            const logo = mediaProps(carrier.logo as never);
            return (
              <li key={carrier.id}>
                {logo ? (
                  <Image
                    src={logo.src}
                    alt={carrier.name}
                    width={160}
                    height={48}
                    // Greyscale until hover keeps a row of clashing brand
                    // colours from competing with the page.
                    className="h-10 w-auto object-contain opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0"
                  />
                ) : (
                  <span className="text-muted text-lg font-semibold tracking-tight">
                    {carrier.name}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </Container>
    </Section>
  );
}
