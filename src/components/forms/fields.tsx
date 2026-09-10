"use client";

import { useEffect, useRef } from "react";
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

// border-border-control, not border-border-subtle. These controls share the
// page's background, so the border is the only thing marking where to type;
// measured against the paper it was 1.28:1, well under the 3:1 WCAG 1.4.11
// asks for the boundary of a control. See the token note in globals.css.
const controlClasses =
  "border-border-control rounded-(--radius-control) bg-surface text-on-surface w-full border px-4 py-3 text-base " +
  "focus-visible:outline-accent focus-visible:outline-2 focus-visible:outline-offset-1 " +
  "aria-[invalid=true]:border-red-600";

/**
 * Wraps a control with its label and error. The error is tied to the input by
 * id and announced politely, so a screen-reader user is told what failed
 * rather than just that the form did not submit.
 */
export function Field({
  label,
  htmlFor,
  error,
  required,
  hint,
  children,
}: {
  label?: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      {label ? (
        // 16px, matching the input. Labels, hints and errors were 14px against
        // a 16px control, which put the instruction below the thing it
        // instructs — backwards for readers with presbyopia, and worst on the
        // error text, which is the one message that has to land.
        <label htmlFor={htmlFor} className="block text-base font-semibold">
          {label}
          {/* The asterisk is hidden from assistive tech and "required" is
              conveyed by the control's own required/aria-required attribute.
              Putting "(required)" inside the label would append it to the
              accessible name, e.g. "Email * (required)". */}
          {required ? (
            <span className="text-red-600" aria-hidden>
              {" "}
              *
            </span>
          ) : null}
        </label>
      ) : null}
      {hint ? (
        <p id={`${htmlFor}-hint`} className="text-muted text-base">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="text-base text-red-700"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClasses, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlClasses, className)} {...props} />;
}

export function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(controlClasses, className)} {...props} />;
}

export function FormStatus({
  tone,
  title,
  children,
}: {
  tone: "success" | "error";
  title: string;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Move focus to the outcome. Submitting replaces the form with this message,
  // which otherwise leaves focus on a button that no longer exists — a keyboard
  // or screen-reader user is dropped back at the top of the document with no
  // idea whether anything happened. aria-live announces it; focus makes it
  // reachable and keeps the next Tab somewhere sensible.
  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="status"
      aria-live="polite"
      className={cn(
        "rounded-(--radius-card) border p-5",
        tone === "success"
          ? "border-green-700/30 bg-green-50 text-green-900"
          : "border-red-700/30 bg-red-50 text-red-900",
      )}
    >
      <p className="font-semibold">{title}</p>
      {children ? <p className="mt-1 text-base">{children}</p> : null}
    </div>
  );
}
