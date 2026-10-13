import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { TeamMember } from "@/components/sections/team-member";
import { team } from "@/content/team";

test("the Meet Nate page lists his highlights under his name", () => {
  const html = renderToStaticMarkup(<TeamMember member={team[0]!} />);

  const h1 = html.indexOf("<h1");
  const list = html.indexOf("data-highlights");
  expect(list).toBeGreaterThan(h1);
  expect(html).toMatch(/<li[^>]*>Licensed since 2015<\/li>/);
  expect(html).toMatch(
    /<li[^>]*><span aria-hidden="true"[^>]*>·<\/span>1,400\+ clients served<\/li>/,
  );
});

test("the Meet Nate page renders no highlight list when there are none", () => {
  const html = renderToStaticMarkup(
    <TeamMember member={{ ...team[0]!, highlights: [] }} />,
  );

  expect(html).not.toContain("data-highlights");
});

test("the credentials list leads with the spelled-out CMIP and keeps every licence", () => {
  const html = renderToStaticMarkup(<TeamMember member={team[0]!} />);
  const section = html.slice(html.indexOf("data-credentials"));
  const items = [...section.matchAll(/<li[^>]*>(.*?)<\/li>/g)].map((m) =>
    m[1]!.replace(/<[^>]+>/g, ""),
  );

  expect(section).toMatch(/<h2[^>]*>Credentials &amp; licences<\/h2>/);
  expect(items).toEqual([
    "Certified Medicare Insurance Planner (CMIP®)",
    "Licensed in MN, WI, IA",
    "AHIP certified",
    "NPN 17742895",
  ]);
  expect(section).toMatch(/CMIP<sup[^>]*>®<\/sup>/);
});

test("the Meet Nate heading explains CMIP on hover and to screen readers", () => {
  const html = renderToStaticMarkup(<TeamMember member={team[0]!} />);
  const h1 = html.slice(html.indexOf("<h1"), html.indexOf("</h1>"));

  expect(h1).toContain('<abbr title="Certified Medicare Insurance Planner"');
});

test("the Meet Nate structured data names the CMIP credential", () => {
  const html = renderToStaticMarkup(<TeamMember member={team[0]!} />);

  expect(html).toContain(
    '"hasCredential":{"@type":"EducationalOccupationalCredential","name":"Certified Medicare Insurance Planner"',
  );
});

test("a member with no credential and no licences shows no credentials block", () => {
  const html = renderToStaticMarkup(
    <TeamMember member={{ ...team[0]!, credential: null, licenses: [] }} />,
  );

  expect(html).not.toContain("data-credentials");
  expect(html).not.toContain("<abbr");
});
