import { Image } from "@/components/ui/image";
import { WithMarks } from "@/components/ui/person-name";
import { Container, Section, type Scheme } from "@/components/ui/section";
import { mediaProps } from "@/lib/media";

export type Carrier = {
  id: number | string;
  name: string;
  logo?: unknown;
  approved?: boolean | null;
};

function CarrierItem({ carrier }: { carrier: Carrier }) {
  const logo = mediaProps(carrier.logo as never);
  return (
    <li translate="no">
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
          className="text-muted text-lg font-semibold tracking-tight whitespace-nowrap"
        >
          <WithMarks text={carrier.name} />
        </span>
      )}
    </li>
  );
}

export function CarrierStrip({
  heading,
  note,
  carriers,
  scheme = "light",
}: {
  heading?: string | null;
  note?: string | null;
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
      <Container className="space-y-(--spacing-small)">
        <h2
          id="carriers-heading"
          className="text-muted text-center text-base font-semibold"
        >
          {heading ?? "We represent"}
        </h2>

        <div
          data-marquee=""
          role="group"
          aria-labelledby="carriers-heading"
          tabIndex={0}
          className="marquee"
        >
          {[0, 1, 2].map((copy) => (
            <ul
              key={copy}
              aria-hidden={copy > 0 || undefined}
              data-marquee-copy={copy > 0 ? "" : undefined}
              className="marquee-row"
            >
              {visible.map((carrier) => (
                <CarrierItem key={carrier.id} carrier={carrier} />
              ))}
            </ul>
          ))}
        </div>
        {note ? (
          <p
            data-carrier-note
            className="text-muted mx-auto max-w-3xl text-center text-sm"
          >
            <WithMarks text={note} />
          </p>
        ) : null}
      </Container>
    </Section>
  );
}
