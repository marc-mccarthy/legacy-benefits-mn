/**
 * Demo seed. Idempotent: re-running replaces the seeded documents rather than
 * stacking duplicates. Values are realistic sample content for client review;
 * swap for the real business details when the site goes live.
 */
import path from "path";
import { fileURLToPath } from "url";
import { getPayload } from "payload";
import config from "../payload.config";
import { env, envAny } from "../lib/env";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const MEDIA_DIR = path.resolve(dirname, "../../.seed-media");

/**
 * Owner and business details come from the environment so that real names,
 * emails, and phone numbers never land in git. Without them the seed produces
 * obviously-fictional placeholder data, which is what a public repo should
 * contain. The real values live in the CMS once entered at /admin.
 */
const OWNER = {
  name: env("OWNER_NAME") ?? "Alex Placeholder",
  // A one-person practice: the owner's address and the business address are
  // the same, so OWNER_EMAIL may be left blank and falls back to the business
  // one. `env` is used rather than `??` because a blank var is "" not undefined.
  email: envAny("OWNER_EMAIL", "BUSINESS_EMAIL") ?? "owner@example.com",
  phone: envAny("OWNER_PHONE", "BUSINESS_PHONE") ?? "(555) 555-0142",
};

const BUSINESS = {
  name: env("BUSINESS_NAME") ?? "Example Benefits",
  email: env("BUSINESS_EMAIL") ?? "hello@example.com",
  phone: env("BUSINESS_PHONE") ?? "(555) 555-0142",
  address:
    env("BUSINESS_ADDRESS") ??
    "1200 Example Street\nSuite 400\nMinneapolis, MN 55403",
  leadEmails:
    envAny("LEAD_NOTIFICATION_EMAILS", "BUSINESS_EMAIL") ?? "leads@example.com",
};

const lexical = (text: string) => ({
  root: {
    type: "root",
    format: "" as const,
    indent: 0,
    version: 1,
    direction: "ltr" as const,
    children: [
      {
        type: "paragraph",
        format: "" as const,
        indent: 0,
        version: 1,
        direction: "ltr" as const,
        children: [
          {
            type: "text",
            detail: 0,
            format: 0,
            mode: "normal",
            style: "",
            text,
            version: 1,
          },
        ],
      },
    ],
  },
});

const SERVICES = [
  {
    title: "Medicare Advantage (Part C)",
    slug: "medicare-advantage",
    summary:
      "All-in-one plans that bundle hospital, medical, and usually drug coverage — with networks and extras that vary a lot by county.",
    order: 1,
  },
  {
    title: "Medicare Supplement (Medigap)",
    slug: "medicare-supplement",
    summary:
      "Fills the gaps Original Medicare leaves behind, with no networks. We compare pricing across the carriers we represent.",
    order: 2,
  },
  {
    title: "Prescription drug coverage (Part D)",
    slug: "part-d",
    summary:
      "We check your actual medication list against each formulary, so the plan you pick covers what you take.",
    order: 3,
  },
];

const ARTICLES = [
  {
    title: "When can I change my Medicare plan?",
    slug: "when-can-i-change-my-plan",
    type: "article" as const,
    excerpt:
      "The enrollment windows, in plain English, and what happens if you miss one.",
  },
  {
    title: "Medicare enrollment checklist",
    slug: "enrollment-checklist",
    type: "tool" as const,
    excerpt:
      "A one-page list of what to gather before you compare plans, including your medication list.",
  },
  {
    title: "Advantage or Supplement: how to think about the choice",
    slug: "advantage-or-supplement",
    type: "article" as const,
    excerpt:
      "The trade-offs that actually matter — networks, travel, and predictability of cost.",
  },
  {
    title: "What Part D actually covers, and the gaps people hit",
    slug: "part-d-coverage-gaps",
    type: "article" as const,
    excerpt:
      "How formularies, tiers, and the annual out-of-pocket cap work in practice.",
  },
  {
    title: "Drug cost comparison worksheet",
    slug: "drug-cost-worksheet",
    type: "tool" as const,
    excerpt:
      "Bring your medication list and compare real annual cost across the plans you are considering.",
  },
  {
    title: "Turning 65: a 6-month timeline",
    slug: "turning-65-timeline",
    type: "video" as const,
    excerpt:
      "A short walkthrough of what to do and when, starting three months before your birthday month.",
  },
  {
    title: "Do I need to do anything during Annual Enrollment?",
    slug: "annual-enrollment-check",
    type: "article" as const,
    excerpt:
      "Plans change every year. Here is the 15-minute check that catches the expensive surprises.",
  },
];

const TEAM = [
  {
    name: OWNER.name,
    slug: "owner",
    role: "Founder & Licensed Agent",
    email: OWNER.email,
    phone: OWNER.phone,
    order: 1,
    licenses: ["Licensed in MN, WI, IA", "AHIP certified", "NPN 19472086"],
    bio: "Eleven years helping people across the Twin Cities sort out Medicare. The practice started after watching his own parents get pushed toward a plan that did not cover their prescriptions.",
  },
  {
    name: "Renata Cruz",
    slug: "renata-cruz",
    role: "Licensed Agent, Part D Specialist",
    email: "renata@example.com",
    phone: "(555) 555-0144",
    order: 2,
    licenses: ["Licensed in MN, WI", "AHIP certified"],
    bio: "Renata builds the drug cost comparisons that most people find the most useful part of a review. She works in English and Spanish.",
  },
  {
    name: "Marcus Bell",
    slug: "marcus-bell",
    role: "Client Service Manager",
    email: "marcus@example.com",
    phone: "(555) 555-0145",
    order: 3,
    licenses: ["Licensed in MN"],
    bio: "Marcus handles claims questions, ID card problems, and the follow-up that usually goes missing after enrollment.",
  },
];

const EVENTS = [
  {
    title: "Medicare Basics Workshop",
    slug: "medicare-basics-workshop",
    summary:
      "A one-hour walk through the parts of Medicare, the enrollment windows, and the questions to ask.",
    venue: "Minneapolis Central Library",
    address: "300 Nicollet Mall, Minneapolis, MN 55401",
    daysOut: 14,
    cost: "free" as const,
  },
  {
    title: "Turning 65 This Year? Start Here",
    slug: "turning-65-this-year",
    summary:
      "What to do in the three months before your birthday month, and the deadlines that carry lifetime penalties.",
    venue: "Roseville Community Center",
    address: "2660 Civic Center Dr, Roseville, MN 55113",
    daysOut: 26,
    cost: "free" as const,
  },
  {
    title: "Annual Enrollment Review Clinic",
    slug: "annual-enrollment-clinic",
    summary:
      "Bring your medication list and current plan. We will run the comparison with you, one on one.",
    venue: `${BUSINESS.name} Office`,
    address: "1200 Nicollet Mall, Suite 400, Minneapolis, MN 55403",
    daysOut: 40,
    cost: "free" as const,
  },
  {
    title: "Medicare & Travel: Coverage Away From Home",
    slug: "medicare-and-travel",
    summary:
      "How networks behave when you spend part of the year elsewhere, and what Supplement plans change.",
    venue: "Edina Senior Center",
    address: "5280 Grandview Sq, Edina, MN 55436",
    daysOut: 54,
    cost: "free" as const,
  },
];

const FAQ = [
  {
    question: "Does it cost anything to work with you?",
    answer:
      "No. We are paid by the insurance carrier when you enroll, and the plan premium is the same whether you use an agent or not.",
  },
  {
    question: "Do you sell every plan available in my area?",
    answer:
      "No, and no agent does. We represent 8 organizations offering 42 products locally. You can always compare every option at Medicare.gov or by calling 1-800-MEDICARE.",
  },
  {
    question: "What should I bring to a review?",
    answer:
      "Your Medicare card, a list of your prescriptions with dosages, and the names of any doctors you want to keep. That is enough to run a real comparison.",
  },
  {
    question: "Will you keep helping me after I enroll?",
    answer:
      "Yes. Claims questions, ID card problems, and the annual check are the part people actually need most, and they are included.",
  },
];

/**
 * Demo imagery. Photographs are Pexels/Unsplash free licence; the avatars are
 * DiceBear "notionists". All of it is placeholder — replace with the client's
 * own photography before launch, especially the team headshots.
 */
const MEDIA = [
  {
    file: "hero-handshake.jpg",
    alt: "An agent shaking hands with a client across a desk",
  },
  {
    file: "advisor-client.jpg",
    alt: "An agent reviewing paperwork with a client",
  },
  {
    file: "couple-bench.jpg",
    alt: "An older couple sitting together outdoors",
  },
  {
    file: "group-seniors.jpg",
    alt: "A group of older adults smiling together",
  },
  { file: "couple-embrace.jpg", alt: "An older couple embracing outdoors" },
  {
    file: "couple-outdoors.jpg",
    alt: "An older couple smiling at each other outdoors",
  },
  { file: "woman-joyful.jpg", alt: "An older woman smiling outdoors" },
  { file: "avatar-Felix.png", alt: "Illustrated portrait avatar" },
  { file: "avatar-Aria.png", alt: "Illustrated portrait avatar" },
  { file: "avatar-Jasper.png", alt: "Illustrated portrait avatar" },
  { file: "avatar-Nova.png", alt: "Illustrated portrait avatar" },
  { file: "avatar-River.png", alt: "Illustrated portrait avatar" },
  { file: "avatar-Sage.png", alt: "Illustrated portrait avatar" },
  { file: "avatar-Cleo.png", alt: "Illustrated portrait avatar" },
];

async function seed() {
  const payload = await getPayload({ config });

  // --- media -------------------------------------------------------------
  const media: Record<string, number> = {};
  for (const item of MEDIA) {
    const existing = await payload.find({
      collection: "media",
      where: { filename: { equals: item.file } },
      limit: 1,
    });
    if (existing.docs[0]) {
      media[item.file] = existing.docs[0].id;
      continue;
    }
    const doc = await payload.create({
      collection: "media",
      data: { alt: item.alt },
      filePath: path.join(MEDIA_DIR, item.file),
    });
    media[item.file] = doc.id;
  }
  payload.logger.info(`Seeded ${Object.keys(media).length} media files`);

  payload.logger.info("Seeding site settings…");
  await payload.updateGlobal({
    slug: "site-settings",
    data: {
      businessName: BUSINESS.name,
      leadNotificationEmails: BUSINESS.leadEmails,
      nav: [
        { label: "Services", href: "/services" },
        { label: "Events", href: "/events" },
        { label: "Learning Center", href: "/learn" },
        { label: "Our Team", href: "/team" },
        { label: "Contact", href: "/contact" },
      ],
      announcement: {
        enabled: true,
        text: "Medicare Annual Enrollment runs Oct 15 – Dec 7.",
        linkLabel: "Book your free review",
        linkHref: "/contact",
        startsAt: new Date(new Date().getFullYear(), 8, 1).toISOString(),
        endsAt: new Date(new Date().getFullYear(), 11, 7).toISOString(),
      },
      stats: [
        { value: 11, suffix: "", label: "Years helping Minnesotans" },
        { value: 1400, suffix: "+", label: "Clients served" },
        { value: 8, suffix: "", label: "Carriers represented" },
        { value: 3, suffix: "", label: "States licensed" },
      ],
      cta: { label: "Talk to an agent", href: "/contact" },
      clientPortal: {
        label: "Client Portal",
        href: "https://www.medicareproapp.com/",
      },
      contact: {
        phone: BUSINESS.phone,
        email: BUSINESS.email,
        address: BUSINESS.address,
      },
      compliance: {
        orgCount: 8,
        planCount: 42,
        npn: "19472086",
        stateLicenses: [
          { state: "MN", licenseNumber: "40615592" },
          { state: "WI", licenseNumber: "18229104" },
          { state: "IA", licenseNumber: "1002418877" },
        ],
      },
    },
  });

  for (const service of SERVICES) {
    const existing = await payload.find({
      collection: "services",
      where: { slug: { equals: service.slug } },
      limit: 1,
    });
    const data = {
      ...service,
      _status: "published" as const,
      body: lexical(
        `${service.summary} We walk through how this works for your situation, with no obligation to enrol.`,
      ),
    };
    if (existing.docs[0]) {
      await payload.update({
        collection: "services",
        id: existing.docs[0].id,
        data,
      });
    } else {
      await payload.create({ collection: "services", data });
    }
  }
  payload.logger.info(`Seeded ${SERVICES.length} services`);

  for (const [i, article] of ARTICLES.entries()) {
    const existing = await payload.find({
      collection: "articles",
      where: { slug: { equals: article.slug } },
      limit: 1,
    });
    const ARTICLE_COVERS: Record<string, string> = {
      "when-can-i-change-my-plan": "couple-embrace.jpg",
      "advantage-or-supplement": "woman-joyful.jpg",
      "turning-65-timeline": "couple-bench.jpg",
    };
    const data = {
      ...article,
      _status: "published" as const,
      publishedAt: new Date(Date.now() - i * 86_400_000).toISOString(),
      // Deliberately partial: the cards without a cover show the
      // brand-colour panel treatment instead.
      coverImage: media[ARTICLE_COVERS[article.slug]],
      body: lexical(article.excerpt),
    };
    if (existing.docs[0]) {
      await payload.update({
        collection: "articles",
        id: existing.docs[0].id,
        data,
      });
    } else {
      await payload.create({ collection: "articles", data });
    }
  }
  payload.logger.info(`Seeded ${ARTICLES.length} articles`);

  const TEAM_AVATARS: Record<string, string> = {
    owner: "avatar-Felix.png",
    "renata-cruz": "avatar-Aria.png",
    "marcus-bell": "avatar-Jasper.png",
  };

  for (const member of TEAM) {
    const existing = await payload.find({
      collection: "team",
      where: { slug: { equals: member.slug } },
      limit: 1,
    });
    const data = {
      name: member.name,
      slug: member.slug,
      role: member.role,
      email: member.email,
      phone: member.phone,
      order: member.order,
      licenses: member.licenses.map((label) => ({ label })),
      headshot: media[TEAM_AVATARS[member.slug]],
      bio: lexical(member.bio),
      _status: "published" as const,
    };
    if (existing.docs[0]) {
      await payload.update({
        collection: "team",
        id: existing.docs[0].id,
        data,
      });
    } else {
      await payload.create({ collection: "team", data });
    }
  }
  payload.logger.info(`Seeded ${TEAM.length} team members`);

  const EVENT_PHOTOS = [
    "group-seniors.jpg",
    "couple-bench.jpg",
    "advisor-client.jpg",
    "couple-outdoors.jpg",
  ];

  for (const [eventIndex, event] of EVENTS.entries()) {
    const existing = await payload.find({
      collection: "events",
      where: { slug: { equals: event.slug } },
      limit: 1,
    });
    const startsAt = new Date(Date.now() + event.daysOut * 86_400_000);
    startsAt.setHours(18, 0, 0, 0);
    const data = {
      title: event.title,
      slug: event.slug,
      summary: event.summary,
      venue: event.venue,
      address: event.address,
      cost: event.cost,
      image: media[EVENT_PHOTOS[eventIndex % EVENT_PHOTOS.length]],
      startsAt: startsAt.toISOString(),
      endsAt: new Date(startsAt.getTime() + 90 * 60_000).toISOString(),
      _status: "published" as const,
      body: lexical(
        "Educational session. No plan-specific benefits are presented and no enrollment applications are accepted. Seating is limited, so let us know if you plan to attend.",
      ),
    };
    if (existing.docs[0]) {
      await payload.update({
        collection: "events",
        id: existing.docs[0].id,
        data,
      });
    } else {
      await payload.create({ collection: "events", data });
    }
  }
  payload.logger.info(`Seeded ${EVENTS.length} events`);

  const TESTIMONIALS = [
    {
      quote:
        "I had three plans in front of me and no idea which one covered my heart medication. He ran the numbers and showed me one of them would have cost me $2,400 more a year. That was the whole conversation.",
      author: "Harold R.",
      location: "Roseville, MN",
      avatar: "avatar-River.png",
      order: 1,
    },
    {
      quote:
        "My husband and I turned 65 four months apart and it was genuinely confusing. He walked us through it twice without ever making us feel slow about it. We still call him first.",
      author: "Jean & Bill M.",
      location: "Edina, MN",
      avatar: "avatar-Sage.png",
      order: 2,
    },
    {
      quote:
        "What I appreciated was that he told me to stay on the plan I already had. He did not make a dollar off that visit. That is why I have sent him four neighbours since.",
      author: "Dolores K.",
      location: "Saint Paul, MN",
      avatar: "avatar-Cleo.png",
      order: 3,
    },
  ];

  for (const t of TESTIMONIALS) {
    const existing = await payload.find({
      collection: "testimonials",
      where: { author: { equals: t.author } },
      limit: 1,
    });
    const data = {
      quote: t.quote,
      author: t.author,
      location: t.location,
      order: t.order,
      photo: media[t.avatar],
      _status: "published" as const,
    };
    if (existing.docs[0]) {
      await payload.update({
        collection: "testimonials",
        id: existing.docs[0].id,
        data,
      });
    } else {
      await payload.create({ collection: "testimonials", data });
    }
  }
  payload.logger.info(`Seeded ${TESTIMONIALS.length} testimonials`);

  // Carrier names only. Real carrier logos are trademarked and their use is
  // governed by each carrier's co-marketing rules, so nothing is marked
  // approved with a logo attached until that clearance exists.
  const CARRIERS = [
    "UnitedHealthcare",
    "Aetna",
    "Humana",
    "Blue Cross Blue Shield of Minnesota",
    "Cigna",
    "Wellcare",
  ];

  for (const [i, name] of CARRIERS.entries()) {
    const existing = await payload.find({
      collection: "carriers",
      where: { name: { equals: name } },
      limit: 1,
    });
    const data = { name, order: i + 1, approved: true };
    if (existing.docs[0]) {
      await payload.update({
        collection: "carriers",
        id: existing.docs[0].id,
        data,
      });
    } else {
      await payload.create({ collection: "carriers", data });
    }
  }
  payload.logger.info(`Seeded ${CARRIERS.length} carriers`);

  // Authored home page, so the demo shows the block-based page builder rather
  // than the fallback composition.
  const homeExisting = await payload.find({
    collection: "pages",
    where: { slug: { equals: "home" } },
    limit: 1,
  });
  // Block union types are generated per blockType; the literals in this array
  // widen to string, so the cast is at the call site rather than annotating
  // every block by hand in a seed script.
  const homeData = {
    title: "Home",
    slug: "home",
    _status: "published" as const,
    layout: [
      {
        blockType: "hero",
        scheme: "dark",
        poster: media["hero-handshake.jpg"],
        heading: "Medicare decisions, made clear.",
        subheading:
          "Independent, licensed guidance on Medicare Advantage, Supplement, and Part D — from people who answer the phone when you call back.",
        ctaLabel: "Talk to a licensed agent",
        ctaHref: "/contact",
      },
      {
        blockType: "serviceGrid",
        scheme: "light",
        heading: "How we help",
        intro:
          "We compare what is actually available to you, across the carriers we represent, against the doctors and prescriptions you already have.",
      },
      {
        blockType: "stats",
        scheme: "muted",
      },
      {
        blockType: "eventCarousel",
        scheme: "light",
        heading: "Free workshops near you",
      },
      {
        blockType: "testimonials",
        scheme: "muted",
        heading: "What clients say",
      },
      {
        blockType: "learningGrid",
        scheme: "light",
        heading: "Learning Center",
        intro: "Straight answers to the questions we get asked most.",
      },
      {
        blockType: "carrierStrip",
        scheme: "light",
        heading: "We represent",
      },
      {
        blockType: "faq",
        scheme: "muted",
        heading: "Common questions",
        items: FAQ.map((f) => ({
          question: f.question,
          answer: lexical(f.answer),
        })),
      },
      {
        blockType: "ctaBand",
        scheme: "dark",
        heading: "Not sure where to start?",
        body: "Tell us a little about your situation and a licensed agent will walk you through the options. No cost, no obligation.",
        ctaLabel: "Request a call",
        ctaHref: "/contact",
      },
    ],
  };
  if (homeExisting.docs[0]) {
    await payload.update({
      collection: "pages",
      id: homeExisting.docs[0].id,
      data: homeData as never,
    });
  } else {
    await payload.create({ collection: "pages", data: homeData as never });
  }
  payload.logger.info("Seeded home page");

  payload.logger.info("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
