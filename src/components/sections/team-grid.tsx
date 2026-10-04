import Image from "next/image";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/card";
import { Container, Section, type Scheme } from "@/components/ui/section";
import { Reveal } from "@/components/motion/reveal";
import { Monogram } from "@/components/ui/monogram";
import { mediaProps } from "@/lib/media";

export type TeamMember = {
  id: number | string;
  name: string;
  slug: string;
  role: string;
  bio?: string;
  photo?: unknown;
};

export function TeamGrid({
  heading,
  members,
  scheme = "light",
  headingLevel = "h2",
}: {
  heading?: string | null;
  members: TeamMember[];
  scheme?: Scheme;
  headingLevel?: "h1" | "h2";
}) {
  if (members.length === 0) return null;

  const Heading = headingLevel;

  return (
    <Section scheme={scheme} aria-labelledby="team-heading">
      <Container className="space-y-10">
        <Heading
          id="team-heading"
          className={
            headingLevel === "h1"
              ? "font-display text-(length:--text-display-page) leading-[1.05] font-bold tracking-[-0.04em] [font-stretch:112%]"
              : "font-display text-(length:--text-display-lg)"
          }
        >
          {heading ?? "Meet Nate"}
        </Heading>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {members.map((member, i) => {
            const photo = mediaProps(member.photo as never);
            return (
              <li key={member.id} className="flex">
                <Reveal
                  delay={Math.min(i * 0.05, 0.15)}
                  className="flex w-full"
                >
                  <Card className="w-full">
                    {photo ? (
                      <Image
                        src={photo.src}
                        alt={member.name}
                        width={600}
                        height={720}
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                        className="aspect-[5/6] w-full object-cover"
                      />
                    ) : (
                      <Monogram
                        name={member.name}
                        className="aspect-[5/6] w-full"
                        textClassName="text-5xl"
                      />
                    )}
                    <CardBody className="gap-1">
                      <h3 className="text-lg font-semibold">
                        <Link
                          href={`/team/${member.slug}`}
                          className="after:absolute after:inset-0"
                        >
                          {member.name}
                        </Link>
                      </h3>
                      <p className="text-muted">{member.role}</p>
                      {member.bio ? <p>{member.bio}</p> : null}
                    </CardBody>
                  </Card>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </Container>
    </Section>
  );
}
