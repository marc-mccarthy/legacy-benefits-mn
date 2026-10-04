import { faq } from "./faq";
import type { PageBlock } from "./types";

export const homeBlocks: PageBlock[] = [
  {
    blockType: "hero",
    scheme: "dark",
    heading: "Medicare, decoded.",
    subheading:
      "Independent, licensed guidance on Medicare Advantage, Supplement, and Part D, from Nate Best. One person, every call.",
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
    scheme: "dark",
  },
  {
    blockType: "eventCarousel",
    scheme: "light",
    heading: "Free workshops near you",
  },
  {
    blockType: "testimonials",
    scheme: "dark",
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
    scheme: "muted",
    heading: "We represent",
  },
  {
    blockType: "faq",
    scheme: "muted",
    heading: "Common questions",
    items: faq,
  },
  {
    blockType: "ctaBand",
    scheme: "black",
    heading: "Not sure where to start?",
    body: "Tell us a little about your situation and a licensed agent will walk you through the options. No cost, no obligation.",
    ctaLabel: "Request a call",
    ctaHref: "/contact",
  },
];
