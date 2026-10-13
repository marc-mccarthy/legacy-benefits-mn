import { expect, it } from "vitest";
import { metadata } from "@/app/(site)/team/page";
import { team } from "@/content/team";

it("titles the Meet Nate page with his name and credential", () => {
  expect(metadata.title).toBe(
    `${team[0]?.name}, ${team[0]?.credential?.short}`,
  );
  expect(metadata.title).toBe("Nate Best, CMIP®");
});
