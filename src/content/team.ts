import { media } from "./media";
import type { TeamMember } from "./types";

export const team: TeamMember[] = [
  {
    id: "owner",
    slug: "owner",
    name: "Nate Best",
    credential: {
      short: "CMIP®",
      full: "Certified Medicare Insurance Planner",
    },
    role: "Founder & Licensed Agent",
    order: 1,
    email: "nateb@legacybenefitsmn.com",
    phone: "(651) 260-1003",
    linkedin: null,
    licenses: ["Licensed in MN, WI, IA", "AHIP certified", "NPN 17742895"],
    highlights: ["Licensed since 2015", "1,400+ clients served"],
    bio: "Helping people across the Twin Cities sort out Medicare since 2015. The practice started after watching his own parents get pushed toward a plan that did not cover their prescriptions.",
    photo: media["team.owner"],
  },
];

export function teamMemberBySlug(slug: string): TeamMember | undefined {
  return team.find((member) => member.slug === slug);
}
