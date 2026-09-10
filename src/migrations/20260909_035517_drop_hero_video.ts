import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Drops the hero block's `video` upload field.
 *
 * The field fed a <video> element that had no `src` and no <source> child, so
 * it never played anything; it was removed rather than repaired, because a
 * looping autoplay background is the wrong default for a 65+ audience. Leaving
 * the field in place would have meant an admin control that silently does
 * nothing.
 *
 * Verified before writing this: 0 of 1 rows in `pages_blocks_hero` and 0 of 3
 * in `_pages_v_blocks_hero` had a non-null `video_id`, so no content is lost.
 * `down` restores the columns, constraints and indexes if this needs reverting.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_hero" DROP CONSTRAINT "pages_blocks_hero_video_id_media_id_fk";
  
  ALTER TABLE "_pages_v_blocks_hero" DROP CONSTRAINT "_pages_v_blocks_hero_video_id_media_id_fk";
  
  DROP INDEX "pages_blocks_hero_video_idx";
  DROP INDEX "_pages_v_blocks_hero_video_idx";
  ALTER TABLE "pages_blocks_hero" DROP COLUMN "video_id";
  ALTER TABLE "_pages_v_blocks_hero" DROP COLUMN "video_id";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_hero" ADD COLUMN "video_id" integer;
  ALTER TABLE "_pages_v_blocks_hero" ADD COLUMN "video_id" integer;
  ALTER TABLE "pages_blocks_hero" ADD CONSTRAINT "pages_blocks_hero_video_id_media_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero" ADD CONSTRAINT "_pages_v_blocks_hero_video_id_media_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "pages_blocks_hero_video_idx" ON "pages_blocks_hero" USING btree ("video_id");
  CREATE INDEX "_pages_v_blocks_hero_video_idx" ON "_pages_v_blocks_hero" USING btree ("video_id");`)
}
