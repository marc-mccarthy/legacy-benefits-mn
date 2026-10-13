import { media } from "./media";
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
    licenses: ["Licensed in MN, WI, IA", "AHIP certified", "NPN 17742895"],
    bio: "Eleven years helping people across the Twin Cities sort out Medicare. The practice started after watching his own parents get pushed toward a plan that did not cover their prescriptions.",
    photo: media["team.owner"],
  },
];

export function teamMemberBySlug(slug: string): TeamMember | undefined {
  return team.find((member) => member.slug === slug);
}
