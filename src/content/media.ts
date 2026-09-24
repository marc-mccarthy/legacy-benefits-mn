import type { MediaAsset } from "./types";

/**
 * One entry per slot in `media-manifest.json`. `srcSet` is empty where the
 * manifest records no derivative, and `src/lib/image-loader.ts` then returns
 * the original unchanged.
 */
export const media: Record<string, MediaAsset> = {
  "pages.poster": {
    src: "/media/pagesposter-a-senior-couple-walking-by-the-lake-sharing-a-ro.jpg",
    width: 6016,
    height: 4016,
    alt: "An older couple walking outdoors on an autumn afternoon",
    srcSet: [
      {
        width: 480,
        format: "avif",
        src: "/media/pagesposter-a-senior-couple-walking-by-the-lake-sharing-a-ro-480.avif",
      },
      {
        width: 480,
        format: "webp",
        src: "/media/pagesposter-a-senior-couple-walking-by-the-lake-sharing-a-ro-480.webp",
      },
      {
        width: 900,
        format: "avif",
        src: "/media/pagesposter-a-senior-couple-walking-by-the-lake-sharing-a-ro-900.avif",
      },
      {
        width: 900,
        format: "webp",
        src: "/media/pagesposter-a-senior-couple-walking-by-the-lake-sharing-a-ro-900.webp",
      },
      {
        width: 1920,
        format: "avif",
        src: "/media/pagesposter-a-senior-couple-walking-by-the-lake-sharing-a-ro-1920.avif",
      },
      {
        width: 1920,
        format: "webp",
        src: "/media/pagesposter-a-senior-couple-walking-by-the-lake-sharing-a-ro-1920.webp",
      },
    ],
  },
  "pages.image": {
    src: "/media/pagesimage-a-business-meeting-between-an-elderly-client-and.jpg",
    width: 6016,
    height: 4016,
    alt: "An older man reviewing plan documents with a licensed insurance agent across a desk",
    srcSet: [
      {
        width: 480,
        format: "avif",
        src: "/media/pagesimage-a-business-meeting-between-an-elderly-client-and-480.avif",
      },
      {
        width: 480,
        format: "webp",
        src: "/media/pagesimage-a-business-meeting-between-an-elderly-client-and-480.webp",
      },
      {
        width: 900,
        format: "avif",
        src: "/media/pagesimage-a-business-meeting-between-an-elderly-client-and-900.avif",
      },
      {
        width: 900,
        format: "webp",
        src: "/media/pagesimage-a-business-meeting-between-an-elderly-client-and-900.webp",
      },
      {
        width: 1920,
        format: "avif",
        src: "/media/pagesimage-a-business-meeting-between-an-elderly-client-and-1920.avif",
      },
      {
        width: 1920,
        format: "webp",
        src: "/media/pagesimage-a-business-meeting-between-an-elderly-client-and-1920.webp",
      },
    ],
  },
  "pages.slides": {
    src: "/media/pagesslides-superior-hiking-trail-autumn-tettegouche-state-p.jpg",
    width: 1920,
    height: 1280,
    alt: "Autumn colour along the Superior Hiking Trail in Tettegouche State Park, Minnesota",
    srcSet: [
      {
        width: 480,
        format: "avif",
        src: "/media/pagesslides-superior-hiking-trail-autumn-tettegouche-state-p-480.avif",
      },
      {
        width: 480,
        format: "webp",
        src: "/media/pagesslides-superior-hiking-trail-autumn-tettegouche-state-p-480.webp",
      },
      {
        width: 900,
        format: "avif",
        src: "/media/pagesslides-superior-hiking-trail-autumn-tettegouche-state-p-900.avif",
      },
      {
        width: 900,
        format: "webp",
        src: "/media/pagesslides-superior-hiking-trail-autumn-tettegouche-state-p-900.webp",
      },
      {
        width: 1920,
        format: "avif",
        src: "/media/pagesslides-superior-hiking-trail-autumn-tettegouche-state-p-1920.avif",
      },
      {
        width: 1920,
        format: "webp",
        src: "/media/pagesslides-superior-hiking-trail-autumn-tettegouche-state-p-1920.webp",
      },
    ],
  },
  "services.image": {
    src: "/media/servicesimage-minneapolis-april-2025-28-skyline-and-mississi.jpg",
    width: 1920,
    height: 1280,
    alt: "The Minneapolis skyline above the Mississippi River",
    srcSet: [
      {
        width: 480,
        format: "avif",
        src: "/media/servicesimage-minneapolis-april-2025-28-skyline-and-mississi-480.avif",
      },
      {
        width: 480,
        format: "webp",
        src: "/media/servicesimage-minneapolis-april-2025-28-skyline-and-mississi-480.webp",
      },
      {
        width: 900,
        format: "avif",
        src: "/media/servicesimage-minneapolis-april-2025-28-skyline-and-mississi-900.avif",
      },
      {
        width: 900,
        format: "webp",
        src: "/media/servicesimage-minneapolis-april-2025-28-skyline-and-mississi-900.webp",
      },
      {
        width: 1920,
        format: "avif",
        src: "/media/servicesimage-minneapolis-april-2025-28-skyline-and-mississi-1920.avif",
      },
      {
        width: 1920,
        format: "webp",
        src: "/media/servicesimage-minneapolis-april-2025-28-skyline-and-mississi-1920.webp",
      },
    ],
  },
  "team.headshot": {
    src: "/media/teamheadshot-confident-handsome-adult-man-in-blue-shirt-sitt.jpg",
    width: 3840,
    height: 3840,
    alt: "Portrait of a licensed insurance agent in a blue shirt, seated at a desk",
    srcSet: [],
  },
  "testimonials.photo": {
    src: "/media/testimonialsphoto-happy-senior-couple-sitting-outdoors-on-a.jpg",
    width: 8400,
    height: 8400,
    alt: "A senior couple sitting outdoors on a sunny winter day",
    srcSet: [],
  },
  "articles.coverImage": {
    src: "/media/articlescoverimage-prairie-sunrise-54762711587.jpg",
    width: 1920,
    height: 1379,
    alt: "Open Minnesota prairie at sunrise",
    srcSet: [
      {
        width: 480,
        format: "avif",
        src: "/media/articlescoverimage-prairie-sunrise-54762711587-480.avif",
      },
      {
        width: 480,
        format: "webp",
        src: "/media/articlescoverimage-prairie-sunrise-54762711587-480.webp",
      },
      {
        width: 900,
        format: "avif",
        src: "/media/articlescoverimage-prairie-sunrise-54762711587-900.avif",
      },
      {
        width: 900,
        format: "webp",
        src: "/media/articlescoverimage-prairie-sunrise-54762711587-900.webp",
      },
      {
        width: 1920,
        format: "avif",
        src: "/media/articlescoverimage-prairie-sunrise-54762711587-1920.avif",
      },
      {
        width: 1920,
        format: "webp",
        src: "/media/articlescoverimage-prairie-sunrise-54762711587-1920.webp",
      },
    ],
  },
  "events.image": {
    src: "/media/eventsimage-mission-farms-tepee-village-plymouth-minnesota-d.jpg",
    width: 1920,
    height: 1347,
    alt: "A Minnesota lake shoreline on a clear summer day",
    srcSet: [
      {
        width: 480,
        format: "avif",
        src: "/media/eventsimage-mission-farms-tepee-village-plymouth-minnesota-d-480.avif",
      },
      {
        width: 480,
        format: "webp",
        src: "/media/eventsimage-mission-farms-tepee-village-plymouth-minnesota-d-480.webp",
      },
      {
        width: 900,
        format: "avif",
        src: "/media/eventsimage-mission-farms-tepee-village-plymouth-minnesota-d-900.avif",
      },
      {
        width: 900,
        format: "webp",
        src: "/media/eventsimage-mission-farms-tepee-village-plymouth-minnesota-d-900.webp",
      },
      {
        width: 1920,
        format: "avif",
        src: "/media/eventsimage-mission-farms-tepee-village-plymouth-minnesota-d-1920.avif",
      },
      {
        width: 1920,
        format: "webp",
        src: "/media/eventsimage-mission-farms-tepee-village-plymouth-minnesota-d-1920.webp",
      },
    ],
  },
};
