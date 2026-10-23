import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");
const lines = readFileSync(resolve(root, "app.env"), "utf8")
  .split("\n")
  .filter(Boolean);
const entries = lines.map((line) => {
  const at = line.indexOf("=");
  return { key: line.slice(0, at), value: line.slice(at + 1), line };
});
const keys = entries.map((e) => e.key);
const ref = (key: string) => entries.find((e) => e.key === key)?.value;

const variablesTf = readFileSync(resolve(root, "infra/variables.tf"), "utf8");
const tfVariables = [...variablesTf.matchAll(/^variable "([^"]+)"/gm)].map(
  (m) => m[1],
);

// Copied from deploy.yml and scripts/with-env.sh, so drift there is not caught here.
const buildFilter = /^(BUSINESS_|DOMAIN_NAME=|NEXT_PUBLIC_)/;
const localDenyFilter = /^(TF_VAR_|AWS_ACCESS_KEY_ID=|AWS_SECRET_ACCESS_KEY=)/;

describe("app.env", () => {
  it("has a TF_VAR_ key for every Terraform variable and no others", () => {
    const tfVarKeys = keys
      .filter((k) => k.startsWith("TF_VAR_"))
      .map((k) => k.slice("TF_VAR_".length));
    expect(tfVariables).toHaveLength(19);
    expect([...tfVarKeys].sort()).toEqual([...tfVariables].sort());
  });

  it("has unique keys in ASCII order", () => {
    expect(new Set(keys).size).toBe(keys.length);
    const sorted = [...keys].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    expect(keys).toEqual(sorted);
  });

  it("holds only quoted op:// references", () => {
    for (const { line } of entries) {
      expect(line).toMatch(/^[A-Z][A-Z0-9_]*="op:\/\/[^"]+"$/);
    }
  });

  it("points duplicated values at the same reference", () => {
    const pairs: [string, string][] = [
      ...[
        "BUSINESS_ADDRESS",
        "BUSINESS_EMAIL",
        "BUSINESS_NAME",
        "BUSINESS_PHONE",
        "DOMAIN_NAME",
        "LEAD_NOTIFICATION_EMAIL",
        "SES_FROM_ADDRESS",
        "TURNSTILE_SECRET",
      ].map((k): [string, string] => [k, `TF_VAR_${k}`]),
      ...["CALENDLY_URL", "GTM_ID", "MEDIA_HOST", "TURNSTILE_SITE_KEY"].map(
        (k): [string, string] => [`NEXT_PUBLIC_${k}`, `TF_VAR_${k}`],
      ),
      ["AWS_REGION", "TF_VAR_REGION"],
    ];
    for (const [a, b] of pairs) {
      expect(ref(a), a).toBeDefined();
      expect(ref(a), `${a} vs ${b}`).toBe(ref(b));
    }
    expect(ref("AWS_REGION")).toBe(
      '"op://Legacy Benefits Group/AWS Credentials/AWS_REGION"',
    );
  });

  it("selects exactly the ten build keys with the deploy build filter", () => {
    const selected = lines.filter((l) => buildFilter.test(l));
    expect(selected.map((l) => l.slice(0, l.indexOf("="))).sort()).toEqual([
      "BUSINESS_ADDRESS",
      "BUSINESS_EMAIL",
      "BUSINESS_NAME",
      "BUSINESS_PHONE",
      "DOMAIN_NAME",
      "NEXT_PUBLIC_CALENDLY_URL",
      "NEXT_PUBLIC_GTM_ID",
      "NEXT_PUBLIC_MEDIA_HOST",
      "NEXT_PUBLIC_SITE_URL",
      "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
    ]);
  });

  it("strips every TF_VAR_ key and all AWS_ keys but AWS_REGION for local scripts", () => {
    const kept = lines
      .filter((l) => !localDenyFilter.test(l))
      .map((l) => l.slice(0, l.indexOf("=")));
    expect(kept.filter((k) => k.startsWith("TF_VAR_"))).toEqual([]);
    expect(kept.filter((k) => k.startsWith("AWS_"))).toEqual(["AWS_REGION"]);
  });
});
