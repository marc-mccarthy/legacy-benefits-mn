import Image from "next/image";
import { Container, Section, type Scheme } from "@/components/ui/section";
import { mediaProps } from "@/lib/media";

export type Carrier = {
  id: number | string;
  name: string;
  logo?: unknown;
  approved?: boolean | null;
};

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
          className="text-muted text-center text-base font-semibold"
        >
          {heading ?? "We represent"}
        </h2>

        <ul className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
          {visible.map((carrier) => {
            const logo = mediaProps(carrier.logo as never);
            return (
              <li key={carrier.id} translate="no">
                {logo ? (
                  <Image
                    src={logo.src}
                    alt={carrier.name}
                    width={160}
                    height={48}
                    translate="no"
                    className="h-10 w-auto object-contain opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0"
                  />
                ) : (
                  <span
                    translate="no"
                    className="text-muted text-lg font-semibold tracking-tight"
                  >
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
