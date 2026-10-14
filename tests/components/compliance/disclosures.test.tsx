import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { FooterComplianceBlock } from "@/components/compliance/disclosures";

test("the footer ends its disclosures with the CMIP designation notice", () => {
  const html = renderToStaticMarkup(<FooterComplianceBlock />);
  const paragraphs = [...html.matchAll(/<p[^>]*>(.*?)<\/p>/g)];
  const last = paragraphs.at(-1)!;

  expect(last[0]).toContain("data-cmip-notice");
  expect(last[0]).toContain("data-compliance");
  expect(last[1]!.replace(/<[^>]+>/g, "")).toContain(
    "The Federal Government, CMS, and Medicare do not affiliate with or endorse ANY professional designation, which includes the CMIP® designation.",
  );
});

test("the CMIP notice is compact but keeps the 16px floor and superscripts its marks", () => {
  const html = renderToStaticMarkup(<FooterComplianceBlock />);
  const notice = html.slice(html.indexOf("data-cmip-notice"));
  const open = notice.slice(0, notice.indexOf(">"));

  expect(open).toContain("text-base");
  expect(open).toContain("leading-snug");
  expect(open).toContain("italic");
  expect(notice).toMatch(/Planner<sup data-legal-mark=""[^>]*>™<\/sup>/);
  expect(notice).toMatch(/CMIP<sup data-legal-mark=""[^>]*>®<\/sup>/);
});
