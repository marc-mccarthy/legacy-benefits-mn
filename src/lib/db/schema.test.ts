import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { crmOutbox, dncRequests, leads, soaSubmissions } from "./schema";

/** Index names, in declaration order, for one table. */
function indexNames(table: Parameters<typeof getTableConfig>[0]): string[] {
  return getTableConfig(table)
    .indexes.map((i) => i.config.name)
    .filter((name): name is string => typeof name === "string");
}

/** The columns an index covers, by database column name. */
function indexColumns(
  table: Parameters<typeof getTableConfig>[0],
  name: string,
): string[] {
  const found = getTableConfig(table).indexes.find(
    (i) => i.config.name === name,
  );
  if (!found) throw new Error(`no index named ${name}`);
  return found.config.columns.map((c) =>
    "name" in c && typeof c.name === "string" ? c.name : String(c),
  );
}

describe("table names", () => {
  it("maps each table to its snake_case relation", () => {
    expect(getTableConfig(leads).name).toBe("leads");
    expect(getTableConfig(soaSubmissions).name).toBe("soa_submissions");
    expect(getTableConfig(dncRequests).name).toBe("dnc_requests");
    expect(getTableConfig(crmOutbox).name).toBe("crm_outbox");
  });
});

describe("indexes", () => {
  it("indexes leads and soa submissions by creation time", () => {
    expect(indexNames(leads)).toEqual(["leads_created_at_idx"]);
    expect(indexColumns(leads, "leads_created_at_idx")).toEqual(["created_at"]);

    expect(indexNames(soaSubmissions)).toEqual(["soa_created_at_idx"]);
    expect(indexColumns(soaSubmissions, "soa_created_at_idx")).toEqual([
      "created_at",
    ]);
  });

  it("indexes both suppression lookup keys separately", () => {
    // A suppression check arrives with an email or a phone, not both, so one
    // composite index would not serve either lookup.
    expect(indexNames(dncRequests).sort()).toEqual([
      "dnc_email_idx",
      "dnc_phone_idx",
    ]);
    expect(indexColumns(dncRequests, "dnc_email_idx")).toEqual(["email"]);
    expect(indexColumns(dncRequests, "dnc_phone_idx")).toEqual(["phone"]);
  });

  it("orders the outbox claim index status-then-due", () => {
    // The drain query filters on status and then takes the oldest due row, so
    // the leading column has to be status for the index to be usable.
    expect(indexNames(crmOutbox)).toEqual(["crm_outbox_claim_idx"]);
    expect(indexColumns(crmOutbox, "crm_outbox_claim_idx")).toEqual([
      "status",
      "next_attempt_at",
    ]);
  });
});

describe("outbox foreign key", () => {
  it("cascades a deleted lead to its outbox rows", () => {
    const [fk] = getTableConfig(crmOutbox).foreignKeys;
    expect(fk).toBeDefined();
    expect(fk?.onDelete).toBe("cascade");

    const reference = fk?.reference();
    expect(reference?.foreignTable).toBe(leads);
    expect(reference?.columns.map((c) => c.name)).toEqual(["lead_id"]);
    expect(reference?.foreignColumns.map((c) => c.name)).toEqual(["id"]);
  });
});
