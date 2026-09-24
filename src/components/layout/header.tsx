"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import { ChevronDown, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/section";
import { cn } from "@/lib/utils";

function suppressPointerOpen(event: ReactPointerEvent<HTMLElement>) {
  event.preventDefault();
}

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

export function Header({ nav, cta, clientPortal, phone, brand }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const pathname = usePathname();
  const isCurrentPage = (href: string) => pathname === href;
  const isWithinSection = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

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
      data-site-header
      style={{ viewTransitionName: "site-header" }}
      className={cn(
        "bg-surface sticky top-0 z-50 transition-shadow duration-200",
        scrolled && "shadow-sm",
      )}
    >
      <div data-scheme="dark" className="bg-surface text-on-surface">
        <Container className="flex h-11 items-center justify-between gap-6 text-base">
          <div className="flex h-full items-center gap-6">
            {phone ? (
              <a
                className="flex h-full items-center hover:underline"
                href={`tel:${phone.replace(/\D/g, "")}`}
              >
                {phone}
              </a>
            ) : null}
            <span className="flex h-full items-center opacity-70">TTY 711</span>
          </div>
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
          "flex items-center justify-between gap-6",
          scrolled ? "h-16" : "h-18",
        )}
      >
        <Link
          href="/"
          aria-current={isCurrentPage("/") ? "page" : undefined}
          className="inline-flex min-h-11 items-center text-lg font-bold tracking-tight"
        >
          {brand}
        </Link>

        <NavigationMenu.Root aria-label="Main" className="hidden lg:block">
          <NavigationMenu.List className="flex items-center gap-7 text-base font-semibold">
            {nav.map((item) => (
              <NavigationMenu.Item
                key={item.href}
                value={item.href}
                className="relative"
              >
                {item.children?.length ? (
                  <>
                    <NavigationMenu.Trigger
                      type="button"
                      aria-current={
                        isCurrentPage(item.href) ? "page" : undefined
                      }
                      onPointerMove={suppressPointerOpen}
                      onPointerLeave={suppressPointerOpen}
                      className={cn(
                        "group flex min-h-11 items-center gap-1 border-b-2",
                        isWithinSection(item.href)
                          ? "nav-active-rule"
                          : "border-transparent",
                      )}
                    >
                      {item.label}
                      <ChevronDown
                        aria-hidden
                        className="size-4 transition-transform group-data-[state=open]:rotate-180"
                      />
                    </NavigationMenu.Trigger>
                    <NavigationMenu.Content
                      data-nav-panel
                      onPointerEnter={suppressPointerOpen}
                      onPointerLeave={suppressPointerOpen}
                      className="border-border-subtle bg-surface absolute top-full left-0 w-72 rounded-(--radius-card) border p-2 shadow-lg"
                    >
                      <ul>
                        {item.children.map((child) => (
                          <li key={child.href}>
                            <NavigationMenu.Link
                              asChild
                              active={isCurrentPage(child.href)}
                            >
                              <Link
                                href={child.href}
                                className="hover:bg-on-surface/5 flex min-h-11 flex-col justify-center rounded-md p-3"
                              >
                                <span className="block">{child.label}</span>
                                {child.description ? (
                                  <span className="text-muted block text-base font-normal">
                                    {child.description}
                                  </span>
                                ) : null}
                              </Link>
                            </NavigationMenu.Link>
                          </li>
                        ))}
                      </ul>
                    </NavigationMenu.Content>
                  </>
                ) : (
                  <NavigationMenu.Link
                    asChild
                    active={isCurrentPage(item.href)}
                  >
                    <Link
                      href={item.href}
                      className={cn(
                        "inline-flex min-h-11 items-center border-b-2",
                        isWithinSection(item.href)
                          ? "nav-active-rule"
                          : "border-transparent",
                      )}
                    >
                      {item.label}
                    </Link>
                  </NavigationMenu.Link>
                )}
              </NavigationMenu.Item>
            ))}
          </NavigationMenu.List>
        </NavigationMenu.Root>

        <div className="hidden items-center gap-3 lg:flex">
          {cta?.href ? (
            <Button asChild size="sm">
              <Link href={cta.href}>{cta.label ?? "Get started"}</Link>
            </Button>
          ) : null}
        </div>

        <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
          <Dialog.Trigger
            className="-mr-3 inline-flex size-11 items-center justify-center lg:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X aria-hidden /> : <Menu aria-hidden />}
          </Dialog.Trigger>

          <Dialog.Portal>
            <Dialog.Overlay
              data-nav-sheet-overlay
              className="bg-on-surface/50 fixed inset-0 z-50"
            />
            <Dialog.Content
              data-nav-sheet
              data-scheme="light"
              className="bg-surface text-on-surface fixed inset-y-0 right-0 z-50 flex w-80 max-w-[calc(100vw-3rem)] flex-col overscroll-contain"
            >
              <Dialog.Title className="sr-only">Menu</Dialog.Title>

              <div className="flex h-18 shrink-0 items-center justify-end px-5">
                <Dialog.Close
                  aria-label="Close menu"
                  className="-mr-3 inline-flex size-11 items-center justify-center"
                >
                  <X aria-hidden />
                </Dialog.Close>
              </div>

              <nav
                aria-label="Site"
                className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4"
              >
                <ul className="flex flex-col gap-1">
                  {nav.flatMap((item) => [
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={
                          isCurrentPage(item.href) ? "page" : undefined
                        }
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
                          aria-current={
                            isCurrentPage(child.href) ? "page" : undefined
                          }
                          className="text-muted flex min-h-11 items-center pl-4 text-base"
                          onClick={() => setMobileOpen(false)}
                        >
                          {child.label}
                        </Link>
                      </li>
                    )),
                  ])}
                </ul>
              </nav>

              <div className="border-border-subtle shrink-0 border-t px-5 py-4">
                {phone ? (
                  <a
                    className="flex min-h-11 items-center font-semibold"
                    href={`tel:${phone.replace(/\D/g, "")}`}
                  >
                    {phone}
                  </a>
                ) : null}
                {cta?.href ? (
                  <Button
                    asChild
                    className="mt-3 w-full"
                    onClick={() => setMobileOpen(false)}
                  >
                    <Link href={cta.href}>{cta.label ?? "Get started"}</Link>
                  </Button>
                ) : null}
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </Container>
    </header>
  );
}
