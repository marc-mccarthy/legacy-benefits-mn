"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/section";
import { cn } from "@/lib/utils";

export type NavItem = {
  label: string;
  href: string;
  children?: { label: string; href: string; description?: string | null }[];
};

type HeaderProps = {
  nav: NavItem[];
  cta?: { label?: string | null; href?: string | null } | null;
  clientPortal?: { label?: string | null; href?: string | null } | null;
  phone?: string | null;
  brand: string;
};

/**
 * Two-tier header: a utility bar for phone and portal, and the main nav —
 * the structure measured on greatwatersfinancial.com. Dropdowns open on click
 * rather than hover so they are usable by keyboard and touch.
 */
export function Header({ nav, cta, clientPortal, phone, brand }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  // Condense the header once the page has moved, so the nav takes less room
  // while reading without ever hiding it.
  //
  // Hysteresis matters more than the threshold: with a single 24px trigger and
  // no debounce, an unsteady scroll toggles the header repeatedly and the nav
  // links move under a pointer that is already reaching for them. Condensing at
  // 120px and only expanding again below 60px means it cannot oscillate.
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = window.scrollY;
        setScrolled((was) => (was ? y > 60 : y > 120));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <header
      data-scheme="light"
      className={cn(
        "bg-surface sticky top-0 z-50 transition-shadow duration-300",
        scrolled && "shadow-sm",
      )}
    >
      {/* This bar does NOT collapse on scroll. It used to: past ~24px the phone
       * number and TTY line animated to max-h-0 and stayed gone until the user
       * scrolled back to the very top of the page. "Find a phone number" is the
       * top task on a site like this, and WCAG 3.2.6 (Consistent Help) wants a
       * contact mechanism in the same relative place on every page — a number
       * that exists only in the first screenful is neither. The main row below
       * still condenses, which is where the scroll affordance belongs. */}
      <div data-scheme="dark" className="bg-surface text-on-surface">
        {/* 16px, not 14px. The phone number is the one piece of text on this
         * page most likely to be read aloud to someone, or copied by hand.
         *
         * The links fill the bar's full 44px rather than sitting inline inside
         * it. As inline text they measured 116x24 and 92x24 — the smallest
         * targets in the header, on the highest-intent link on a Medicare site.
         * `h-full` costs no layout: the bar is already 44px tall. */}
        <Container className="flex h-11 items-center justify-end gap-6 text-base">
          {phone ? (
            <a
              className="flex h-full items-center hover:underline"
              href={`tel:${phone.replace(/\D/g, "")}`}
            >
              {phone}
            </a>
          ) : null}
          <span className="flex h-full items-center opacity-70">TTY 711</span>
          {clientPortal?.href ? (
            <a
              className="flex h-full items-center hover:underline"
              href={clientPortal.href}
            >
              {clientPortal.label ?? "Client Portal"}
            </a>
          ) : null}
        </Container>
      </div>

      <Container
        className={cn(
          "flex items-center justify-between gap-6 transition-all duration-300",
          scrolled ? "h-16" : "h-18",
        )}
      >
        {/* min-h-11 throughout the nav, matching the floor argued for in
         * button.tsx. That floor lived only in the Button component, so every
         * link here — which is most of the header — quietly opted out of it and
         * shipped at 28-36px. */}
        <Link
          href="/"
          className="inline-flex min-h-11 items-center text-lg font-bold tracking-tight"
        >
          {brand}
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-7 text-base font-semibold">
            {nav.map((item) => (
              <li key={item.href} className="relative">
                {item.children?.length ? (
                  <>
                    <button
                      type="button"
                      aria-expanded={openMenu === item.href}
                      onClick={() =>
                        setOpenMenu(openMenu === item.href ? null : item.href)
                      }
                      className="flex min-h-11 items-center gap-1"
                    >
                      {item.label}
                      <ChevronDown
                        aria-hidden
                        className={cn(
                          "size-4 transition-transform",
                          openMenu === item.href && "rotate-180",
                        )}
                      />
                    </button>
                    {openMenu === item.href ? (
                      <ul className="border-border-subtle bg-surface absolute top-full left-0 w-72 rounded-(--radius-card) border p-2 shadow-lg">
                        {item.children.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              onClick={() => setOpenMenu(null)}
                              className="hover:bg-on-surface/5 block rounded-md p-3"
                            >
                              <span className="block">{child.label}</span>
                              {child.description ? (
                                <span className="text-muted block text-base font-normal">
                                  {child.description}
                                </span>
                              ) : null}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </>
                ) : (
                  <Link
                    href={item.href}
                    className="inline-flex min-h-11 items-center"
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {cta?.href ? (
            <Button asChild size="sm">
              <Link href={cta.href}>{cta.label ?? "Get started"}</Link>
            </Button>
          ) : null}
        </div>

        {/* The negative margin keeps the icon optically aligned with the
         * container edge while the 44px hit area extends past it. */}
        <button
          type="button"
          className="-mr-3 inline-flex size-11 items-center justify-center lg:hidden"
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X aria-hidden /> : <Menu aria-hidden />}
        </button>
      </Container>

      {mobileOpen ? (
        <div
          id="mobile-nav"
          className="border-border-subtle border-t lg:hidden"
        >
          <Container className="py-4">
            <ul className="flex flex-col gap-1">
              {nav.flatMap((item) => [
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex min-h-11 items-center font-semibold"
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>,
                ...(item.children ?? []).map((child) => (
                  <li key={child.href}>
                    <Link
                      href={child.href}
                      className="text-muted flex min-h-11 items-center pl-4 text-base"
                      onClick={() => setMobileOpen(false)}
                    >
                      {child.label}
                    </Link>
                  </li>
                )),
              ])}
            </ul>
            {cta?.href ? (
              <Button asChild className="mt-4 w-full">
                <Link href={cta.href}>{cta.label ?? "Get started"}</Link>
              </Button>
            ) : null}
          </Container>
        </div>
      ) : null}
    </header>
  );
}
