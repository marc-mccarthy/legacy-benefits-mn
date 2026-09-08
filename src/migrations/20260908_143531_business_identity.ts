import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

/**
 * Adds the business identity fields to site settings.
 *
 * `business_name` is NOT NULL, and any environment that already has a settings
 * row would fail the constraint. So the column is added nullable, backfilled
 * from the BUSINESS_NAME environment variable (the previous source of truth),
 * and only then made NOT NULL. Generated migrations do not know to do this —
 * it was added by hand after the original failed against existing data.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  const fallback = process.env["BUSINESS_NAME"] || "Our Agency";

  await db.execute(sql`
    ALTER TABLE "site_settings" ADD COLUMN "business_name" varchar;
    ALTER TABLE "site_settings" ADD COLUMN "lead_notification_emails" varchar;
  `);

  await db.execute(sql`
    UPDATE "site_settings"
    SET "business_name" = ${fallback}
    WHERE "business_name" IS NULL;
  `);

  await db.execute(sql`
    ALTER TABLE "site_settings" ALTER COLUMN "business_name" SET NOT NULL;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "site_settings" DROP COLUMN "business_name";
    ALTER TABLE "site_settings" DROP COLUMN "lead_notification_emails";
  `);
}
