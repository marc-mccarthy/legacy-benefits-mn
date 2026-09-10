"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { soaInputSchema, type SoaInput } from "@/lib/compliance/soa-schema";
import {
  SOA_ATTESTATION,
  SOA_PRODUCT_TYPES,
} from "@/lib/compliance/disclosures";
import { Field, FormStatus, Input, Textarea } from "./fields";
import { Turnstile } from "./turnstile";

/**
 * Scope of Appointment. CMS requires this to be documented before a Medicare
 * Advantage or Part D sales meeting, and requires it to record the specific
 * product types the beneficiary agreed to discuss — hence checkboxes rather
 * than a single "Medicare" catch-all.
 */
export function SoaForm({ turnstileSiteKey }: { turnstileSiteKey?: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );

  const [turnstileToken, setTurnstileToken] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SoaInput>({
    resolver: zodResolver(soaInputSchema),
    defaultValues: { productTypes: [] },
  });

  const onSubmit = handleSubmit(async (values) => {
    setStatus("sending");
    try {
      const res = await fetch("/api/soa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, turnstileToken }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  });

  if (status === "sent") {
    return (
      <FormStatus tone="success" title="Scope of Appointment recorded.">
        We have saved a copy. You can ask us for it at any time. This does not
        enrol you in a plan or change your current coverage.
      </FormStatus>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Field
        label="Your full name"
        htmlFor="beneficiaryName"
        error={errors.beneficiaryName?.message}
        required
      >
        <Input
          id="beneficiaryName"
          required
          aria-required
          autoComplete="name"
          {...register("beneficiaryName")}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Phone"
          htmlFor="soa-phone"
          error={errors.phone?.message}
          required
        >
          <Input
            id="soa-phone"
            type="tel"
            required
            aria-required
            autoComplete="tel"
            {...register("phone")}
          />
        </Field>
        <Field label="Email" htmlFor="soa-email" error={errors.email?.message}>
          <Input
            id="soa-email"
            type="email"
            autoComplete="email"
            {...register("email")}
          />
        </Field>
      </div>

      <Field
        label="Address"
        htmlFor="soa-address"
        error={errors.address?.message}
      >
        <Textarea
          id="soa-address"
          rows={2}
          autoComplete="street-address"
          {...register("address")}
        />
      </Field>

      <fieldset className="space-y-3">
        <legend className="text-base font-semibold">
          Which product types may we discuss?
          <span className="text-red-600" aria-hidden>
            {" "}
            *
          </span>
        </legend>
        <p className="text-muted text-base">
          We may only discuss the products you select here.
        </p>
        {SOA_PRODUCT_TYPES.map((product) => (
          <label key={product.value} className="flex gap-3 leading-relaxed">
            <input
              type="checkbox"
              value={product.value}
              // 24px. These select which products a licensed agent is
              // permitted to discuss — a mis-tap here is a compliance record
              // that says something the beneficiary did not agree to.
              className="mt-1 size-6 shrink-0"
              {...register("productTypes")}
            />
            <span>{product.label}</span>
          </label>
        ))}
        {errors.productTypes ? (
          <p role="alert" className="text-base text-red-700">
            {errors.productTypes.message}
          </p>
        ) : null}
      </fieldset>

      <Field label="Agent name (if known)" htmlFor="agentName">
        <Input id="agentName" {...register("agentName")} />
      </Field>

      {/* The attestation is what the beneficiary is signing. It is read before
          a signature, so it does not get to be the smallest text on the page. */}
      <div className="border-border-subtle rounded-(--radius-card) border p-5 leading-relaxed">
        {SOA_ATTESTATION}
      </div>

      <Field
        label="Type your name to sign"
        htmlFor="signature"
        error={errors.signature?.message}
        hint="Typing your name here is your electronic signature."
        required
      >
        <Input
          id="signature"
          required
          aria-required
          {...register("signature")}
        />
      </Field>

      <Turnstile siteKey={turnstileSiteKey} onToken={setTurnstileToken} />

      {status === "error" ? (
        <FormStatus tone="error" title="We could not save that.">
          Please try again, or call us and we will complete it with you.
        </FormStatus>
      ) : null}

      <Button type="submit" size="lg" disabled={status === "sending"}>
        {status === "sending" ? "Saving…" : "Sign and submit"}
      </Button>
    </form>
  );
}
