import type { Metadata } from "next";
import { TeamMember } from "@/components/sections/team-member";
import { team } from "@/content/team";

export const metadata: Metadata = {
  title: "Nate Best",
  description:
    "Meet Nate Best, the licensed Medicare agent you talk to every time.",
};

export default function TeamPage() {
  return <TeamMember member={team[0]!} />;
}
