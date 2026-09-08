import path from "path";
import { fileURLToPath } from "url";
import { buildConfig } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { s3Storage } from "@payloadcms/storage-s3";
import sharp from "sharp";

import { Users } from "@/collections/Users";
import { Media } from "@/collections/Media";
import { Pages } from "@/collections/Pages";
import { Services } from "@/collections/Services";
import { Team } from "@/collections/Team";
import { Events } from "@/collections/Events";
import { Articles } from "@/collections/Articles";
import { Categories } from "@/collections/Categories";
import { Testimonials } from "@/collections/Testimonials";
import { Carriers } from "@/collections/Carriers";
import { SiteSettings } from "@/globals/SiteSettings";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Media goes to S3 in every deployed environment; local dev falls back to
// disk so a developer never needs AWS credentials to run the site.
const useS3 = Boolean(process.env.S3_BUCKET);

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
  },
  collections: [
    Pages,
    Services,
    Team,
    Events,
    Articles,
    Categories,
    Testimonials,
    Carriers,
    Media,
    Users,
  ],
  globals: [SiteSettings],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || "",
  typescript: { outputFile: path.resolve(dirname, "payload-types.ts") },
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL || "" },
    // Schema changes ship as reviewed migrations, never as an implicit push.
    push: false,
    migrationDir: path.resolve(dirname, "migrations"),
  }),
  sharp,
  plugins: useS3
    ? [
        s3Storage({
          collections: { media: true },
          bucket: process.env.S3_BUCKET as string,
          config: {
            region: process.env.AWS_REGION,
            // No static keys: ECS task role supplies credentials.
          },
        }),
      ]
    : [],
});
