import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TeamMember } from "@/components/sections/team-member";
import { team, teamMemberBySlug } from "@/content/team";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return team.map((member) => ({ slug: member.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const doc = teamMemberBySlug(slug);
  if (!doc) return {};
  return {
    title: doc.name,
    description: `${doc.name} — ${doc.role}`,
    alternates: { canonical: "/team" },
  };
}

export default async function TeamMemberPage({ params }: Props) {
  const { slug } = await params;
  const doc = teamMemberBySlug(slug);
  if (!doc) notFound();
  return <TeamMember member={doc} />;
}
