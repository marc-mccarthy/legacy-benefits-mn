"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { postJson } from "@/lib/post-json";
import { dncInputSchema, type DncInput } from "@/lib/compliance/dnc-schema";
import { Field, FormStatus, Input, Select, Textarea } from "./fields";

const REQUEST_TYPES = [
  {
    value: "revoke-contact",
    label: "Stop contacting me (calls, texts, email)",
  },
  {
    value: "do-not-sell",
    label: "Do not sell or share my personal information",
  },
  { value: "delete-my-data", label: "Delete my personal information" },
];

export function DncForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DncInput>({
    resolver: zodResolver(dncInputSchema),
    defaultValues: { requestType: "revoke-contact" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setStatus("sending");
    try {
      const res = await postJson("/api/do-not-contact", values);
      if (!res.ok) throw new Error(String(res.status));
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  });

  if (status === "sent") {
    return (
      <FormStatus tone="success" title="Your request has been recorded.">
        We have added you to our suppression list. Requests are actioned within
        10 business days, and usually much sooner.
      </FormStatus>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <Field
        label="What would you like us to do?"
        htmlFor="requestType"
        required
      >
        <Select id="requestType" {...register("requestType")}>
          {REQUEST_TYPES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Email to suppress"
          htmlFor="dnc-email"
          error={errors.email?.message}
        >
          <Input id="dnc-email" type="email" {...register("email")} />
        </Field>
        <Field
          label="Phone to suppress"
          htmlFor="dnc-phone"
          error={errors.phone?.message}
        >
          <Input id="dnc-phone" type="tel" {...register("phone")} />
        </Field>
      </div>

      <Field label="Anything else we should know?" htmlFor="dnc-notes">
        <Textarea id="dnc-notes" rows={3} {...register("notes")} />
      </Field>

      {status === "error" ? (
        <FormStatus tone="error" title="We could not record that.">
          Please call us so we can action your request directly.
        </FormStatus>
      ) : null}

      <Button type="submit" size="lg" disabled={status === "sending"}>
        {status === "sending" ? "Submitting…" : "Submit request"}
      </Button>
    </form>
  );
}
