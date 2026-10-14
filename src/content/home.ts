import { faq } from "./faq";
import type { PageBlock } from "./types";

export const homeBlocks: PageBlock[] = [
  {
    blockType: "hero",
    scheme: "dark",
    heading: "Medicare, decoded.",
    subheading:
      "Independent, licensed guidance on Medicare Advantage, Supplement, and Part D, from Nate Best, the same person every time you call.",
    ctaLabel: "Talk to a licensed agent",
    ctaHref: "/contact",
  },
  {
    blockType: "noise",
    scheme: "black",
    heading: "Dozens of plans. One deadline.",
    body: "Medicare comes at you from every direction. Nate's job is to turn it into one clear answer you can act on.",
  },
  {
    blockType: "signal",
    scheme: "dark",
    heading: "You talk to Nate. Every time.",
    ctaLabel: "Request a call back",
  },
  {
    blockType: "serviceGrid",
    scheme: "light",
    heading: "How we help",
    intro:
      "We compare what is actually available to you, across the carriers we represent, against the doctors and prescriptions you already have.",
  },
  {
    blockType: "lake",
    scheme: "black",
    heading: "Every season of Medicare, one call away.",
    body: "Turning 65, changing plans, or checking in every fall. Nate is here for each part of the year.",
  },
  {
    blockType: "learningGrid",
    scheme: "light",
    heading: "Learning Center",
    intro: "Straight answers to the questions we get asked most.",
  },
  {
    blockType: "testimonials",
    scheme: "dark",
    heading: "What clients say",
  },
  {
    blockType: "stats",
    scheme: "dark",
  },
  {
    blockType: "carrierStrip",
    scheme: "muted",
    heading: "We represent",
    note: "All trademarks are the property of their respective owners. Blue Cross® and Blue Shield® of Minnesota is a nonprofit independent licensee of the Blue Cross and Blue Shield Association.",
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
