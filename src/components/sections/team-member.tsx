import { Image } from "@/components/ui/image";
import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";
import { JsonLd, personSchema } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { PersonName, WithMarks } from "@/components/ui/person-name";
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
          credential: member.credential,
          role: member.role,
          slug: member.slug,
        })}
      />
      <Section scheme="dark" className="py-8 md:py-12">
        <Container className="grid items-start gap-6 md:grid-cols-[1fr_auto] md:grid-rows-[auto_1fr] md:gap-x-16 md:gap-y-8">
          <div>
            <p className="text-action text-base font-semibold tracking-widest uppercase">
              {member.role}
            </p>
            <h1 className="font-display text-(length:--text-display-page) leading-[1.05] font-bold tracking-[-0.04em] [font-stretch:112%]">
              <PersonName name={member.name} credential={member.credential} />
            </h1>
            {member.highlights.length ? (
              <ul
                data-highlights
                className="mt-4 flex flex-col gap-x-3 gap-y-1 text-lg font-semibold sm:flex-row sm:flex-wrap sm:items-center md:text-xl"
              >
                {member.highlights.map((highlight, i) => (
                  <li key={highlight} className="flex items-center gap-x-3">
                    {i > 0 ? (
                      <span
                        aria-hidden
                        className="text-action hidden sm:inline"
                      >
                        ·
                      </span>
                    ) : null}
                    {highlight}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          {photo ? (
            <Image
              src={photo.src}
              alt={photo.alt}
              width={photo.width}
              height={photo.height}
              sizes="(min-width: 768px) 400px, 340px"
              className="ring-star-gold mx-auto h-auto w-full max-w-[340px] rounded-(--radius-card) ring-[3px] md:row-span-2 md:row-start-1 md:mx-0 md:max-h-[calc(100svh-17rem)] md:w-auto md:max-w-[480px]"
              priority
            />
          ) : null}
          <Reveal className="space-y-6 md:col-start-1 md:row-start-2">
            <p className="lead text-xl md:text-2xl">{member.bio}</p>
            <Button asChild>
              <Link href="/contact">Request a call back</Link>
            </Button>
          </Reveal>
        </Container>
      </Section>
      <Section>
        <Container className="space-y-6">
          {member.credential || member.licenses.length ? (
            <div data-credentials className="space-y-3">
              <h2 className="font-display text-2xl font-semibold">
                Credentials &amp; licences
              </h2>
              <ul className="space-y-1 text-base">
                {member.credential ? (
                  <li className="font-semibold">
                    {member.credential.full} (
                    <WithMarks text={member.credential.short} />)
                  </li>
                ) : null}
                {member.licenses.map((license) => (
                  <li key={license} className="text-muted">
                    {license}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {member.phone ? (
            <p>
              <PhoneLink
                phone={member.phone}
                className="text-action text-(length:--text-display-lg)"
              />
            </p>
          ) : null}
        </Container>
      </Section>
    </>
  );
}
