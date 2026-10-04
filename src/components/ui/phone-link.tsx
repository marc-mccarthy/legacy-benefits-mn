import { Fragment } from "react";
import { cn } from "@/lib/utils";

export function PhoneLink({
  phone,
  className,
}: {
  phone: string;
  className?: string;
}) {
  return (
    <a
      href={`tel:${phone.replace(/\D/g, "")}`}
      className={cn(
        "tabular inline-block min-h-11 min-w-11 font-semibold tracking-[0.02em] hover:underline",
        className,
      )}
    >
      {phone.split(" ").map((part, index) => (
        <Fragment key={index}>
          {index > 0 ? " " : null}
          <span className="whitespace-nowrap">{part}</span>
        </Fragment>
      ))}
    </a>
  );
}
