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
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      data-scheme="light"
      className={cn(
        "bg-surface sticky top-0 z-50 transition-shadow duration-300",
        scrolled && "shadow-sm",
      )}
    >
      <div
        data-scheme="dark"
        className={cn(
          "bg-surface text-on-surface overflow-hidden transition-all duration-300",
          scrolled ? "max-h-0 opacity-0" : "max-h-12 opacity-100",
        )}
      >
        <Container className="flex h-10 items-center justify-end gap-6 text-sm">
          {phone ? (
            <a
              className="hover:underline"
              href={`tel:${phone.replace(/\D/g, "")}`}
            >
              {phone}
            </a>
          ) : null}
          <span className="opacity-70">TTY 711</span>
          {clientPortal?.href ? (
            <a className="hover:underline" href={clientPortal.href}>
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
        <Link href="/" className="text-lg font-bold tracking-tight">
          {brand}
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-7 text-sm font-semibold">
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
                      className="flex items-center gap-1 py-2"
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
                                <span className="text-muted block text-xs font-normal">
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
                  <Link href={item.href} className="py-2">
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

        <button
          type="button"
          className="lg:hidden"
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
                    className="block py-3 font-semibold"
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>,
                ...(item.children ?? []).map((child) => (
                  <li key={child.href}>
                    <Link
                      href={child.href}
                      className="text-muted block py-2 pl-4 text-sm"
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
