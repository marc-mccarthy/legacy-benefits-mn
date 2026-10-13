import { Fragment } from "react";
import type { Credential } from "@/content/types";

const MARKS = /([®℠™])/;

export function WithMarks({ text }: { text: string }) {
  return text.split(MARKS).map((part, i) =>
    i % 2 === 1 ? (
      <sup
        key={i}
        className="relative -top-[0.75em] ml-[0.05em] align-baseline text-[0.45em] font-normal tracking-normal"
      >
        {part}
      </sup>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

export function PersonName({
  name,
  credential,
}: {
  name: string;
  credential: Credential | null;
}) {
  if (!credential) return <>{name}</>;

  const abbreviation = credential.short.split(MARKS)[0] ?? "";

  return (
    <>
      {name}
      <span className="whitespace-nowrap">
        {", "}
        <abbr title={credential.full} className="no-underline">
          {abbreviation}
        </abbr>
        <WithMarks text={credential.short.slice(abbreviation.length)} />
      </span>
    </>
  );
}
