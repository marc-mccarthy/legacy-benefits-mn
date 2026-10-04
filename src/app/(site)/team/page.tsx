import type { Metadata } from "next";
import { TeamGrid } from "@/components/sections/team-grid";
import { team } from "@/content/team";

export const metadata: Metadata = {
  title: "Nate Best",
  description:
    "Meet Nate Best, the licensed Medicare agent you talk to every time.",
};

export default function TeamPage() {
  return (
    <TeamGrid headingLevel="h1" heading="Nate Best" members={team as never} />
  );
}
