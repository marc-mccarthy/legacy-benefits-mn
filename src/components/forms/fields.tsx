"use client";

import { useEffect, useRef } from "react";
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

const controlClasses =
  "border-border-control rounded-(--radius-control) bg-surface text-on-surface w-full border px-4 py-3 text-base " +
  "placeholder:text-muted aria-[invalid=true]:border-red-600 user-invalid:border-red-600";

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
        <label htmlFor={htmlFor} className="block text-base font-semibold">
          {label}
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
  large = false,
  children,
}: {
  tone: "success" | "error";
  title: string;
  large?: boolean;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="status"
      aria-live="polite"
      data-size={large ? "large" : undefined}
      className={cn(
        "scroll-mt-[calc(var(--header-stack)+1.5rem)] rounded-(--radius-card) border",
        large
          ? "flex min-h-80 flex-col justify-center border-2 p-8 md:p-10"
          : "p-5",
        tone === "success"
          ? "border-green-700/30 bg-green-50 text-green-900"
          : "border-red-700/30 bg-red-50 text-red-900",
      )}
    >
      <p
        className={cn(
          "font-semibold",
          large && "font-display text-2xl leading-tight md:text-3xl",
        )}
      >
        {title}
      </p>
      {children ? (
        <p className={cn(large ? "mt-4 text-lg md:text-xl" : "mt-1 text-base")}>
          {children}
        </p>
      ) : null}
    </div>
  );
}
