import { Image } from "@/components/ui/image";
import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";
import { JsonLd, personSchema } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { PhoneLink } from "@/components/ui/phone-link";
import { Container, Section } from "@/components/ui/section";
import type { TeamMember as Member } from "@/content/types";

export function TeamMember({ member }: { member: Member }) {
  const { photo } = member;

  return (
    <>
      <JsonLd
        data={personSchema({
          name: member.name,
          role: member.role,
          slug: member.slug,
        })}
      />
      <Section scheme="dark">
        <Container>
          <p className="text-action text-base font-semibold tracking-widest uppercase">
            {member.role}
          </p>
          <h1 className="font-display text-(length:--text-display-page) leading-[1.05] font-bold tracking-[-0.04em] [font-stretch:112%]">
            {member.name}
          </h1>
        </Container>
      </Section>
      <Section>
        <Container className="grid items-start gap-10 md:grid-cols-[480px_1fr] md:gap-16">
          {photo ? (
            <Image
              src={photo.src}
              alt={photo.alt}
              width={photo.width}
              height={photo.height}
              sizes="(min-width: 768px) 480px, 100vw"
              className="mx-auto h-auto w-full max-w-[480px] rounded-(--radius-card) md:mx-0"
              priority
            />
          ) : null}
          <Reveal className="space-y-8">
            <p className="lead text-xl md:text-2xl">{member.bio}</p>
            {member.licenses.length ? (
              <ul className="text-muted space-y-1 text-base">
                {member.licenses.map((license) => (
                  <li key={license}>{license}</li>
                ))}
              </ul>
            ) : null}
            {member.phone ? (
              <p>
                <PhoneLink
                  phone={member.phone}
                  className="text-action text-(length:--text-display-lg)"
                />
              </p>
            ) : null}
            <Button asChild>
              <Link href="/contact">Request a call back</Link>
            </Button>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}
