"use client";

import { WELCOME_GIFT_ITEMS } from "@menao/core";
import type { WelcomeGift } from "@menao/validation";
import { Gift } from "lucide-react";
import { startTransition, useActionState, useState } from "react";
import {
  AddressSummary,
  CapArt,
  ChoiceTile,
  GiftSteps,
  SizePills,
  TshirtArt,
} from "@/components/pro/gift-kit";
import { Alert, Button, Field, FieldError, StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { chooseWelcomeGift } from "@/lib/artisan/referral-actions";
import { initialFormState } from "@/lib/auth/form";
import { formatDay } from "@/lib/format";

const t = fr.pro.hub.welcomeGift;

/**
 * Cadeau de bienvenue du filleul (F-60, ADR 0154 ; maquette du lot 37) en haut de « Mon profil » :
 * t-shirt (avec sa taille) ou casquette en grands choix illustrés, adresse de l'entreprise en
 * résumé ; puis le suivi de l'envoi (choisi, en préparation, envoyé).
 */
export function WelcomeGiftCard({ gift }: { gift: WelcomeGift }) {
  const choosing = gift.status === "a_choisir";
  return (
    <section
      id="cadeau"
      aria-labelledby="hub-welcome-gift"
      className={`flex scroll-mt-24 flex-col gap-5 rounded-card bg-surface p-5 shadow-card sm:p-6 ${
        choosing ? "border-2 border-primary" : "border border-border"
      }`}
    >
      <div className="flex items-start gap-3.5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-strong">
          <Gift aria-hidden="true" className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="hub-welcome-gift" className="text-[1.375rem] leading-tight font-bold">
              {t.title}
            </h2>
            {!choosing && (
              <StatusBadge tone={gift.status === "envoye" ? "success" : "primary"}>
                {gift.status === "envoye" ? t.statusSent : t.statusPending}
              </StatusBadge>
            )}
          </div>
          {choosing && (
            <p className="text-[0.9375rem] text-muted-foreground">{t.lead(gift.referrer)}</p>
          )}
        </div>
      </div>
      {choosing ? <GiftForm gift={gift} /> : <GiftTracking gift={gift} />}
    </section>
  );
}

/** Après le choix : le cadeau et sa frise (choisi, en préparation, envoyé). */
function GiftTracking({ gift }: { gift: WelcomeGift }) {
  const sent = gift.status === "envoye";
  const name = gift.item ? t.summary(t.items[gift.item], gift.size) : "";
  return (
    <div className="grid gap-5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center">
      <div className="flex flex-col items-center gap-2 rounded-input bg-background p-4 text-center">
        {gift.item === "casquette" ? (
          <CapArt className="size-24" />
        ) : (
          <TshirtArt className="size-24" />
        )}
        <span className="text-sm font-semibold">{name}</span>
      </div>
      <GiftSteps
        label={t.stepsLabel}
        steps={[
          { label: t.steps.chosen, hint: name, state: "done" },
          {
            label: t.steps.preparing,
            hint: t.steps.preparingHint,
            state: sent ? "done" : "current",
          },
          {
            label: t.steps.sent,
            hint:
              sent && gift.sent_at ? t.steps.sentOn(formatDay(gift.sent_at)) : t.steps.sentLater,
            state: sent ? "done" : "todo",
          },
        ]}
      />
    </div>
  );
}

function GiftForm({ gift }: { gift: WelcomeGift }) {
  const [state, formAction, pending] = useActionState(chooseWelcomeGift, initialFormState);
  const [item, setItem] = useState(state.values?.item ?? "");
  const errors = state.fieldErrors ?? {};
  if (state.success) return <Alert tone="success">{state.success}</Alert>;
  const values = state.values;
  const address = gift.address;
  const addressError = Boolean(
    errors.recipient || errors.ligne || errors.code_postal || errors.commune,
  );
  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
    >
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <fieldset
        className="flex flex-col gap-2"
        aria-describedby={errors.item ? "item-error" : undefined}
      >
        <legend className="sr-only">{t.itemLegend}</legend>
        <div className="flex gap-3">
          {WELCOME_GIFT_ITEMS.map((value) => (
            <ChoiceTile
              key={value}
              name="item"
              value={value}
              label={t.items[value]}
              art={
                value === "casquette" ? (
                  <CapArt className="size-20 sm:size-24" />
                ) : (
                  <TshirtArt className="size-20 sm:size-24" />
                )
              }
              checked={item === value}
              onChange={() => setItem(value)}
            />
          ))}
        </div>
        {errors.item?.[0] && <FieldError id="item-error">{errors.item[0]}</FieldError>}
      </fieldset>
      {item === "tshirt" && (
        <SizePills
          name="size"
          legend={t.sizeLegend}
          value={values?.size}
          error={errors.size?.[0]}
        />
      )}
      <AddressSummary
        title={t.delivery}
        lines={[
          address.recipient,
          address.ligne,
          [address.code_postal, address.commune].filter(Boolean).join(" ") || null,
        ]}
        hint={t.companyAddress}
        editLabel={t.editAddress}
        open={addressError}
      >
        <Field
          label={t.recipient}
          name="recipient"
          autoComplete="name"
          defaultValue={values?.recipient ?? address.recipient ?? ""}
          errors={errors.recipient}
        />
        <Field
          label={t.address}
          name="ligne"
          autoComplete="street-address"
          defaultValue={values?.ligne ?? address.ligne ?? ""}
          errors={errors.ligne}
        />
        <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
          <Field
            label={t.postalCode}
            name="code_postal"
            autoComplete="postal-code"
            inputMode="numeric"
            maxLength={5}
            defaultValue={values?.code_postal ?? address.code_postal ?? ""}
            errors={errors.code_postal}
          />
          <Field
            label={t.city}
            name="commune"
            autoComplete="address-level2"
            defaultValue={values?.commune ?? address.commune ?? ""}
            errors={errors.commune}
          />
        </div>
      </AddressSummary>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <Button type="submit" disabled={pending} block={false} className="sm:self-start">
          <Gift aria-hidden="true" className="size-4" />
          {t.submit}
        </Button>
        <p className="text-[0.8125rem] text-muted-foreground">{t.note}</p>
      </div>
    </form>
  );
}
