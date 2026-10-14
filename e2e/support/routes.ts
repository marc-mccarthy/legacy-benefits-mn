import { articles } from "../../src/content/articles";
import { services } from "../../src/content/services";
import { team } from "../../src/content/team";

export const PAGES = [
  "/",
  "/services",
  `/services/${services[0].slug}`,
  "/learn",
  `/learn/${articles[0].slug}`,
  "/team",
  `/team/${team[0].slug}`,
  "/contact",
  "/scope-of-appointment",
  "/do-not-contact",
  "/privacy",
  "/disclosures",
  "/accessibility",
];
