import { articles } from "../../src/content/articles";
import { services } from "../../src/content/services";
import { team } from "../../src/content/team";

export type Tier = "home" | "inform" | "transact" | "static";

export type Route = { path: string; tier: Tier };

export const ROUTES: Route[] = [
  { path: "/", tier: "home" },
  { path: "/services", tier: "inform" },
  { path: `/services/${services[0].slug}`, tier: "inform" },
  { path: "/learn", tier: "inform" },
  { path: `/learn/${articles[0].slug}`, tier: "inform" },
  { path: "/team", tier: "inform" },
  { path: `/team/${team[0].slug}`, tier: "inform" },
  { path: "/contact", tier: "transact" },
  { path: "/scope-of-appointment", tier: "transact" },
  { path: "/do-not-contact", tier: "transact" },
  { path: "/privacy", tier: "static" },
  { path: "/disclosures", tier: "static" },
  { path: "/accessibility", tier: "static" },
];

export const PAGES = ROUTES.map((route) => route.path);
