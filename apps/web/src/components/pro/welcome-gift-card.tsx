"use client";

import { REWARD_SIZES, WELCOME_GIFT_ITEMS } from "@menao/core";
import type { WelcomeGift } from "@menao/validation";
import { Gift } from "lucide-react";
import { startTransition, useActionState, useState } from "react";
import { Alert, Button, Field, FieldError } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { chooseWelcomeGift } from "@/lib/artisan/referral-actions";
import { initialFormState } from "@/lib/auth/form";
import { formatDay } from "@/lib/format";

const t = fr.pro.hub.welcomeGift;

/**
 * Cadeau de bienvenue du filleul (F-60, ADR 0154) dans « Mon profil » : t-shirt (avec sa taille)
 * ou casquette, adresse pré-remplie avec celle de l'entreprise ; puis l'état de l'envoi.
 */
export function WelcomeGiftCard({ gift }: { gift: WelcomeGift }) {
  return (
    <section
      id="cadeau"
      aria-labelledby="hub-welcome-gift"
      className="flex scroll-mt-24 flex-col gap-4 rounded-card border border-primary-soft bg-primary-softer p-5 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface text-primary shadow-card">
          <Gift aria-hidden="true" className="size-5" />
        </span>
        <div className="flex flex-col gap-0.5">
          <h2 id="hub-welcome-gift" className="text-[1.0625rem] font-medium">
            {t.title}
          </h2>
          {gift.status === "a_choisir" ? (
            <p className="text-sm text-muted-foreground">{t.lead(gift.referrer)}</p>
          ) : (
            <p className="text-sm">
              <span className="font-medium">
                {gift.item && t.summary(t.items[gift.item], gift.size)}
              </span>
              {" · "}
              {gift.status === "envoye" && gift.sent_at
                ? t.sent(formatDay(gift.sent_at))
                : t.pending}
            </p>
          )}
        </div>
      </div>
      {gift.status === "a_choisir" && <GiftForm gift={gift} />}
    </section>
  );
}

function GiftForm({ gift }: { gift: WelcomeGift }) {
  const [state, formAction, pending] = useActionState(chooseWelcomeGift, initialFormState);
  const [item, setItem] = useState(state.values?.item ?? "");
  const errors = state.fieldErrors ?? {};
  if (state.success) return <Alert tone="success">{state.success}</Alert>;
  const values = state.values;
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
    >
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Choices
        name="item"
        legend={t.itemLegend}
        options={WELCOME_GIFT_ITEMS.map((value) => ({ value, label: t.items[value] }))}
        value={item}
        onChange={setItem}
        error={errors.item?.[0]}
        columns="grid-cols-2"
      />
      {item === "tshirt" && (
        <Choices
          name="size"
          legend={t.sizeLegend}
          options={REWARD_SIZES.map((value) => ({ value, label: value }))}
          value={values?.size}
          error={errors.size?.[0]}
          columns="grid-cols-5"
        />
      )}
      <p className="pt-1 text-sm font-medium">{t.delivery}</p>
      <Field
        label={t.recipient}
        name="recipient"
        autoComplete="name"
        defaultValue={values?.recipient ?? gift.address.recipient ?? ""}
        errors={errors.recipient}
      />
      <Field
        label={t.address}
        name="ligne"
        autoComplete="street-address"
        defaultValue={values?.ligne ?? gift.address.ligne ?? ""}
        errors={errors.ligne}
      />
      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <Field
          label={t.postalCode}
          name="code_postal"
          autoComplete="postal-code"
          inputMode="numeric"
          maxLength={5}
          defaultValue={values?.code_postal ?? gift.address.code_postal ?? ""}
          errors={errors.code_postal}
        />
        <Field
          label={t.city}
          name="commune"
          autoComplete="address-level2"
          defaultValue={values?.commune ?? gift.address.commune ?? ""}
          errors={errors.commune}
        />
      </div>
      <Button type="submit" disabled={pending}>
        {t.submit}
      </Button>
      <p className="text-center text-xs text-muted-foreground">{t.note}</p>
    </form>
  );
}

/** Choix exclusif en boutons (cadeau, taille), comme les tailles des récompenses des grades. */
function Choices({
  name,
  legend,
  options,
  value,
  onChange,
  error,
  columns,
}: {
  name: string;
  legend: string;
  options: { value: string; label: string }[];
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  columns: string;
}) {
  return (
    <fieldset
      className="flex flex-col gap-2"
      aria-describedby={error ? `${name}-error` : undefined}
    >
      <legend className="pb-1 text-sm font-medium">{legend}</legend>
      <div className={`grid gap-2 ${columns}`}>
        {options.map((option) => (
          <label key={option.value} className="relative">
            <input
              type="radio"
              name={name}
              value={option.value}
              defaultChecked={value === option.value}
              onChange={onChange ? () => onChange(option.value) : undefined}
              className="peer sr-only"
            />
            <span className="flex min-h-11 cursor-pointer items-center justify-center rounded-input border border-border bg-surface px-2 text-sm font-medium transition-colors peer-checked:border-primary peer-checked:bg-primary-soft peer-checked:text-primary-strong peer-focus-visible:ring-4 peer-focus-visible:ring-primary/20 hover:bg-background">
              {option.label}
            </span>
          </label>
        ))}
      </div>
      {error && <FieldError id={`${name}-error`}>{error}</FieldError>}
    </fieldset>
  );
}
