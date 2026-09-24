"use client";

import { ViewTransition, type ReactNode } from "react";
import { usePathname } from "next/navigation";

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

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
