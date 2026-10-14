import { media } from "./media";
import type { TeamMember } from "./types";

export const team: TeamMember[] = [
  {
    id: "owner",
    slug: "owner",
    name: "Nate Best",
    credential: {
      short: "CMIP®",
      full: "Certified Medicare Insurance Planner™",
    },
    role: "Founder & Licensed Agent",
    order: 1,
    email: "nbest@legacybenefitsmn.com",
    phone: "(651) 260-1003",
    linkedin: null,
    licenses: ["Licensed in MN, WI, IA", "AHIP certified", "NPN 17742895"],
    highlights: ["Licensed since 2015", "1,400+ clients served"],
    bio: "Helping people across the Midwest navigate their insurance benefits since 2015. The practice started after watching his own parents get pushed toward a plan that did not cover their prescriptions.",
    about: [
      "At Legacy Benefits Group, we believe Medicare shouldn't be complicated, and finding the right coverage shouldn't feel overwhelming.",
      "Founded by independent insurance broker Nate, Legacy Benefits Group is a Minnesota-based agency dedicated to helping individuals understand their Medicare options and make confident, informed decisions about their healthcare coverage.",
      "We take a personalized approach because no two people have the same healthcare needs, financial circumstances, or priorities. Whether you're new to Medicare, reviewing your current plan, or navigating changes to your coverage, our goal is to make the process simple, straightforward, and stress-free.",
      "As an independent agency, we work with multiple insurance carriers to help clients explore coverage options that fit their individual needs.",
      "Our commitment doesn't end when you enroll. We believe in building lasting relationships, providing ongoing support, and being a trusted resource as your healthcare needs change.",
      "At Legacy Benefits Group, you're more than a policy number. You're someone we're proud to serve.",
    ],
    interests: [
      "Plays volleyball",
      "Active father with his daughter",
      "Spends time with his dogs, Doyle and Mitka",
      "Basketball fan",
      "Family cabin in Wisconsin",
    ],
    photo: media["team.owner"],
  },
];

export function teamMemberBySlug(slug: string): TeamMember | undefined {
  return team.find((member) => member.slug === slug);
}
