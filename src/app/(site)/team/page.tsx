import type { Metadata } from "next";
import { TeamGrid } from "@/components/sections/team-grid";
import { getTeam } from "@/lib/payload";

export const metadata: Metadata = {
  title: "Our team",
  description: "The licensed agents you will actually be speaking to.",
};

export default async function TeamPage() {
  const members = await getTeam().catch(() => []);
  return <TeamGrid heading="Our team" members={members as never} />;
}
