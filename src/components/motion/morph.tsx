import {
  ViewTransition,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";

export type MorphKind = "learn";

export function morphName(kind: MorphKind, slug: string): string {
  return `morph-${kind}-${slug.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

export function Morph({
  kind,
  slug,
  children,
}: {
  kind: MorphKind;
  slug: string;
  children: ReactNode;
}) {
  const name = morphName(kind, slug);

  return (
    <ViewTransition name={name} share="morph" default="none">
      {isValidElement(children)
        ? cloneElement(children as ReactElement<Record<string, unknown>>, {
            "data-morph": name,
          })
        : children}
    </ViewTransition>
  );
}
