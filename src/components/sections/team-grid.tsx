import Image from "next/image";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/card";
import { Container, Section, type Scheme } from "@/components/ui/section";
import { Reveal } from "@/components/motion/reveal";
import { mediaProps } from "@/lib/media";

export type TeamMember = {
  id: number | string;
  name: string;
  slug: string;
  role: string;
  headshot?: unknown;
};

export function TeamGrid({
  heading,
  members,
  scheme = "light",
}: {
  heading?: string | null;
  members: TeamMember[];
  scheme?: Scheme;
}) {
  if (members.length === 0) return null;

  return (
    <Section scheme={scheme} aria-labelledby="team-heading">
      <Container className="space-y-10">
        <h2
          id="team-heading"
          className="text-3xl font-semibold tracking-tight md:text-5xl"
        >
          {heading ?? "Meet the team"}
        </h2>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {members.map((member, i) => {
            const photo = mediaProps(member.headshot as never);
            return (
              <li key={member.id} className="flex">
                <Reveal
                  delay={Math.min(i * 0.06, 0.24)}
                  className="flex w-full"
                >
                  <Card className="w-full">
                    {photo ? (
                      <Image
                        src={photo.src}
                        alt={member.name}
                        width={600}
                        height={720}
                        sizes="(min-width: 1024px) 25vw, 50vw"
                        className="aspect-[5/6] w-full object-cover"
                      />
                    ) : null}
                    <CardBody className="gap-1">
                      <h3 className="text-lg font-semibold">
                        <Link
                          href={`/team/${member.slug}`}
                          className="after:absolute after:inset-0"
                        >
                          {member.name}
                        </Link>
                      </h3>
                      <p className="text-muted text-sm">{member.role}</p>
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
