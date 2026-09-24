import type { Metadata } from "next";
import { TeamGrid } from "@/components/sections/team-grid";
import { team } from "@/content/team";

export const metadata: Metadata = {
  title: "Our team",
  description: "The licensed agents you will actually be speaking to.",
};

export default function TeamPage() {
  return <TeamGrid heading="Our team" members={team as never} />;
}
