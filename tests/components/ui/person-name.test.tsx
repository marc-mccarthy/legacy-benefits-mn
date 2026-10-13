import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { PersonName, WithMarks } from "@/components/ui/person-name";
import { personSchema } from "@/components/seo/json-ld";

const cmip = { short: "CMIP®", full: "Certified Medicare Insurance Planner" };

test("PersonName renders the bare name when there is no credential", () => {
  const html = renderToStaticMarkup(
    <PersonName name="Nate Best" credential={null} />,
  );

  expect(html).toBe("Nate Best");
});

test("PersonName spells out the credential and superscripts the registered mark", () => {
  const html = renderToStaticMarkup(
    <PersonName name="Nate Best" credential={cmip} />,
  );

  expect(html).toMatch(
    /^Nate Best<span class="whitespace-nowrap">, <abbr title="Certified Medicare Insurance Planner"[^>]*>CMIP<\/abbr><sup class="[^"]*">®<\/sup><\/span>$/,
  );
});

test("PersonName leaves a credential without a mark unchanged", () => {
  const html = renderToStaticMarkup(
    <PersonName
      name="Nate Best"
      credential={{ short: "CFP", full: "Certified Financial Planner" }}
    />,
  );

  expect(html).toMatch(
    /^Nate Best<span class="whitespace-nowrap">, <abbr title="Certified Financial Planner"[^>]*>CFP<\/abbr><\/span>$/,
  );
  expect(html).not.toContain("<sup");
});

test("WithMarks superscripts every registered mark and keeps the other text", () => {
  const html = renderToStaticMarkup(<WithMarks text="A® and B®" />);

  expect(html.match(/<sup[^>]*>®<\/sup>/g)).toHaveLength(2);
  expect(html.replace(/<[^>]+>/g, "")).toBe("A® and B®");
});

test("WithMarks superscripts service and trademark marks too", () => {
  const html = renderToStaticMarkup(<WithMarks text="A℠ B™ C" />);

  expect(html.match(/<sup[^>]*>(℠|™)<\/sup>/g)).toHaveLength(2);
  expect(html.replace(/<[^>]+>/g, "")).toBe("A℠ B™ C");
});

test("WithMarks leaves text with no marks untouched", () => {
  expect(
    renderToStaticMarkup(
      <WithMarks text="Insurance Company of North America (INA)" />,
    ),
  ).toBe("Insurance Company of North America (INA)");
});

test("personSchema adds the suffix and the spelled-out credential only when one exists", () => {
  const withCredential = personSchema({
    name: "Nate Best",
    credential: cmip,
    role: "Founder",
    slug: "owner",
  });
  const without = personSchema({
    name: "Nate Best",
    credential: null,
    role: "Founder",
    slug: "owner",
  });

  expect(withCredential).toMatchObject({
    name: "Nate Best",
    honorificSuffix: "CMIP®",
    hasCredential: {
      "@type": "EducationalOccupationalCredential",
      name: "Certified Medicare Insurance Planner",
      credentialCategory: "certification",
    },
  });
  expect(without).not.toHaveProperty("honorificSuffix");
  expect(without).not.toHaveProperty("hasCredential");
});
