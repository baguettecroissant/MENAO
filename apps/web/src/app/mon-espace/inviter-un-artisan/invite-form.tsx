"use client";

import { useActionState, useEffect, useRef } from "react";
import { Alert, Button, Field, Select, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState } from "@/lib/auth/form";
import { inviteArtisan } from "@/lib/project/space-actions";

const t = fr.inviteArtisan;

/** Formulaire d'invitation (ADR 0162) : vidé après l'envoi, pour inviter un autre artisan. */
export function InviteArtisanForm({ trades }: { trades: { code: string; label: string }[] }) {
  const [state, formAction, pending] = useActionState(inviteArtisan, initialFormState);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.success) form.current?.reset();
  }, [state]);
  const errors = state.fieldErrors ?? {};
  const value = (name: string) => (state.success ? "" : (state.values?.[name] ?? ""));

  return (
    <form ref={form} action={formAction} className="flex flex-col gap-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      <Field
        label={t.company}
        name="company"
        defaultValue={value("company")}
        errors={errors.company}
        maxLength={120}
        autoComplete="organization"
        required
      />
      <Field
        label={t.contactName}
        labelNote={t.optional}
        name="contact_name"
        defaultValue={value("contact_name")}
        errors={errors.contact_name}
        maxLength={120}
        autoComplete="off"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t.phone}
          name="phone"
          type="tel"
          inputMode="tel"
          defaultValue={value("phone")}
          errors={errors.phone}
          autoComplete="off"
        />
        <Field
          label={t.email}
          name="email"
          type="email"
          defaultValue={value("email")}
          errors={errors.email}
          autoComplete="off"
        />
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">{t.contactHint}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="invite-trade" className="text-sm font-medium">
            {t.trade} <span className="font-normal text-subtle-foreground">{t.optional}</span>
          </label>
          <Select id="invite-trade" name="trade_code" defaultValue={value("trade_code")}>
            <option value="">{t.tradeChoose}</option>
            {trades.map((trade) => (
              <option key={trade.code} value={trade.code}>
                {trade.label}
              </option>
            ))}
          </Select>
        </div>
        <Field
          label={t.city}
          labelNote={t.optional}
          name="city"
          defaultValue={value("city")}
          errors={errors.city}
          maxLength={100}
          autoComplete="off"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="invite-message" className="text-sm font-medium">
          {t.message} <span className="font-normal text-subtle-foreground">{t.optional}</span>
        </label>
        <textarea
          id="invite-message"
          name="message"
          defaultValue={value("message")}
          rows={3}
          maxLength={500}
          className={`${inputClasses} min-h-24 py-3`}
        />
      </div>
      <p className="text-xs text-muted-foreground">{t.privacy}</p>
      <Button type="submit" size="lg" disabled={pending}>
        {t.submit}
      </Button>
    </form>
  );
}
