import type { CollectionConfig } from "payload";
import { authenticated } from "@/access";

export const Media: CollectionConfig = {
  slug: "media",
  admin: { group: "Content" },
  access: {
    read: () => true,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  upload: {
    // Sized ahead of time so next/image is never upscaling or over-fetching.
    imageSizes: [
      { name: "thumbnail", width: 480, height: undefined, position: "centre" },
      { name: "card", width: 900, height: undefined, position: "centre" },
      { name: "hero", width: 1920, height: undefined, position: "centre" },
    ],
    mimeTypes: ["image/*", "video/*", "application/pdf"],
  },
  fields: [
    {
      name: "alt",
      type: "text",
      required: true,
      admin: {
        description:
          "Describe the image for screen readers. Use an empty space only if purely decorative.",
      },
    },
    { name: "credit", type: "text" },
  ],
};
