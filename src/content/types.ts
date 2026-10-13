import type { ReactNode } from "react";

export type MediaAsset = {
  src: string;
  width: number;
  height: number;
  alt: string;
  srcSet: {
    width: number;
    format: "avif" | "webp" | "jpeg";
    src: string;
    bytes: number;
  }[];
};

export type NavItem = {
  label: string;
  href: string;
  children?: { label: string; href: string; description?: string | null }[];
};

export type Stat = {
  value: number;
  suffix?: string | null;
  label: string;
  year?: boolean;
};

export type ServiceItem = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  order: number;
  image: MediaAsset | null;
  Body: () => ReactNode;
};

export type Credential = { short: string; full: string };

export type TeamMember = {
  id: string;
  name: string;
  credential: Credential | null;
  slug: string;
  role: string;
  order: number;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  licenses: string[];
  highlights: string[];
  bio: string;
  photo: MediaAsset | null;
};

export type Article = {
  id: string;
  title: string;
  slug: string;
  type: "article" | "tool" | "video";
  excerpt: string;
  publishedAt: string;
  coverImage: MediaAsset | null;
  Body: () => ReactNode;
};

export type Testimonial = {
  id: string;
  quote: string;
  author: string;
  location: string | null;
  photo: MediaAsset | null;
};

export type Carrier = {
  id: string;
  name: string;
  approved: boolean;
  logo: MediaAsset | null;
};

export type FaqItem = { question: string; answer: ReactNode };

export type PageBlock = {
  blockType: string;
  scheme?: "light" | "muted" | "dark" | "black";
} & Record<string, unknown>;

export type SiteContent = {
  nav: NavItem[];
  announcement: {
    enabled: boolean;
    text: string | null;
    linkLabel: string | null;
    linkHref: string | null;
    startsAt: string | null;
    endsAt: string | null;
  };
  stats: Stat[];
  clientPortal: { label: string | null; href: string | null };
  compliance: {
    orgCount: number | null;
    planCount: number | null;
    npn: string | null;
    footerDisclosure: string | null;
    stateLicenses: { state: string; licenseNumber: string }[];
  };
  social: { platform: string; href: string }[];
};
