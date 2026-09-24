import type { TeamMember } from "./types";

export const team: TeamMember[] = [
  {
    id: "owner",
    slug: "owner",
    name: "Nate Best",
    role: "Founder & Licensed Agent",
    order: 1,
    email: "nateb@legacybenefitsmn.com",
    phone: "(651) 260-1003",
    linkedin: null,
    licenses: ["Licensed in MN, WI, IA", "AHIP certified", "NPN 19472086"],
    bio: "Eleven years helping people across the Twin Cities sort out Medicare. The practice started after watching his own parents get pushed toward a plan that did not cover their prescriptions.",
    photo: null,
  },
  {
    id: "renata-cruz",
    slug: "renata-cruz",
    name: "Renata Cruz",
    role: "Licensed Agent, Part D Specialist",
    order: 2,
    email: "renata@example.com",
    phone: "(555) 555-0144",
    linkedin: null,
    licenses: ["Licensed in MN, WI", "AHIP certified"],
    bio: "Renata builds the drug cost comparisons that most people find the most useful part of a review. She works in English and Spanish.",
    photo: null,
  },
  {
    id: "marcus-bell",
    slug: "marcus-bell",
    name: "Marcus Bell",
    role: "Client Service Manager",
    order: 3,
    email: "marcus@example.com",
    phone: "(555) 555-0145",
    linkedin: null,
    licenses: ["Licensed in MN"],
    bio: "Marcus handles claims questions, ID card problems, and the follow-up that usually goes missing after enrollment.",
    photo: null,
  },
];

export function teamMemberBySlug(slug: string): TeamMember | undefined {
  return team.find((member) => member.slug === slug);
}
