"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { leadInputSchema, type LeadInput } from "@/lib/leads/schema";
import { Field, FormStatus, Input, Select, Textarea } from "./fields";
import { Turnstile } from "./turnstile";

const INTERESTS = [
  { value: "medicare-advantage", label: "Medicare Advantage (Part C)" },
  { value: "supplement", label: "Medicare Supplement (Medigap)" },
  { value: "part-d", label: "Prescription drug coverage (Part D)" },
  { value: "life", label: "Life insurance" },
  { value: "other", label: "Something else" },
];

export function ContactForm({
  consentText,
  turnstileSiteKey,
}: {
  consentText: string;
  turnstileSiteKey?: string;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LeadInput>({
    resolver: zodResolver(leadInputSchema),
    defaultValues: { consent: false },
  });

  const onSubmit = handleSubmit(async (values) => {
    setStatus("sending");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          sourcePath: window.location.pathname,
          utm: Object.fromEntries(
            [...new URLSearchParams(window.location.search)].filter(([k]) =>
              k.startsWith("utm_"),
            ),
          ),
        }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error
          ? "We could not send that just now. Please try again, or call us."
          : "Unexpected error",
      );
    }
  });

  if (status === "sent") {
    return (
      <FormStatus tone="success" title="Thanks — we have your request.">
        A licensed agent will reach out. If you need help sooner, call us and
        ask for a licensed agent.
      </FormStatus>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {/* Honeypot. Hidden from sight and from screen readers, but a bot
          filling every input will trip it. */}
      <div aria-hidden className="hidden">
        <label htmlFor="company">Company</label>
        <input
          id="company"
          tabIndex={-1}
          autoComplete="off"
          {...register("company")}
        />
      </div>

      <Field
        label="Full name"
        htmlFor="name"
        error={errors.name?.message}
        required
      >
        <Input
          id="name"
          required
          aria-required
          autoComplete="name"
          {...register("name")}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Email"
          htmlFor="email"
          error={errors.email?.message}
          required
        >
          <Input
            id="email"
            type="email"
            required
            aria-required
            autoComplete="email"
            {...register("email")}
          />
        </Field>
        <Field label="Phone" htmlFor="phone" error={errors.phone?.message}>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            {...register("phone")}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="ZIP code" htmlFor="zip" error={errors.zip?.message}>
          <Input
            id="zip"
            inputMode="numeric"
            autoComplete="postal-code"
            {...register("zip")}
          />
        </Field>
        <Field
          label="What can we help with?"
          htmlFor="interest"
          error={errors.interest?.message}
        >
          <Select id="interest" {...register("interest")}>
            <option value="">Select an option</option>
            {INTERESTS.map((i) => (
              <option key={i.value} value={i.value}>
                {i.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field
        label="Anything else?"
        htmlFor="message"
        error={errors.message?.message}
      >
        <Textarea id="message" rows={4} {...register("message")} />
      </Field>

      {/* The consent language is rendered in full, at body size. Summarising
          it would invalidate it as express written consent. */}
      <Field htmlFor="consent" error={errors.consent?.message}>
        <label className="flex gap-3 text-sm leading-relaxed">
          <input
            id="consent"
            type="checkbox"
            className="mt-1 size-4 shrink-0"
            {...register("consent")}
          />
          <span>{consentText}</span>
        </label>
      </Field>

      <Turnstile
        siteKey={turnstileSiteKey}
        onToken={(token) => setValue("turnstileToken", token)}
      />

      {status === "error" && errorMessage ? (
        <FormStatus tone="error" title="Something went wrong">
          {errorMessage}
        </FormStatus>
      ) : null}

      <Button type="submit" size="lg" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Request a call"}
      </Button>
    </form>
  );
}
