"use client";

import { useEffect, ViewTransition, type ReactNode } from "react";
import { usePathname } from "next/navigation";

const IRIS = true;

const FADE_ONLY = new Set([
  "/contact",
  "/scope-of-appointment",
  "/do-not-contact",
  "/privacy",
  "/disclosures",
  "/accessibility",
]);

function irisTarget(event: MouseEvent): URL | null {
  if (event.button !== 0 || event.defaultPrevented) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    return null;
  const anchor = (event.target as Element | null)?.closest?.("a[href]");
  if (!anchor || (anchor as HTMLAnchorElement).target === "_blank") return null;
  const url = new URL((anchor as HTMLAnchorElement).href, location.href);
  return url.origin === location.origin ? url : null;
}

function startIris(event: MouseEvent) {
  const url = irisTarget(event);
  if (!url) return;
  const root = document.documentElement;
  const pointed = event.detail > 0;
  root.style.setProperty(
    "--vt-x",
    `${pointed ? event.clientX : innerWidth / 2}px`,
  );
  root.style.setProperty(
    "--vt-y",
    `${pointed ? event.clientY : innerHeight / 2}px`,
  );
  root.toggleAttribute(
    "data-iris",
    url.pathname !== location.pathname &&
      !FADE_ONLY.has(url.pathname.replace(/\/$/, "")),
  );
}

function clearIris() {
  document.documentElement.removeAttribute("data-iris");
}

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!IRIS) return;
    document.addEventListener("click", startIris, true);
    addEventListener("popstate", clearIris);
    return () => {
      document.removeEventListener("click", startIris, true);
      removeEventListener("popstate", clearIris);
    };
  }, []);

  return (
    <ViewTransition
      key={pathname}
      exit="page-exit"
      enter="page-enter"
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
