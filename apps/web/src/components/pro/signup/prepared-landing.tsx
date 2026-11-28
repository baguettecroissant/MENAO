"use client";

import { ARTISAN_SIGNUP_DRAFT_KEY, type ArtisanSignupDraft } from "@menao/core";
import { ArrowRight, Lock } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Alert, Button } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { savePreparedPrefill, type PreparedPrefill } from "@/lib/artisan/prepared-prefill";
import { forgetPreparedSignup } from "@/lib/commercial/prepared-signup-actions";
import { formatPhone } from "@/lib/format";

const t = fr.commercialField.preparedLanding;

const formatSiret = (siret: string) =>
  siret.replace(/^(\d{3})(\d{3})(\d{3})(\d{5})$/, "$1 $2 $3 $4");

/**
 * Récapitulatif de l'inscription préparée (ADR 0395) ; « C'est bien moi » range le brouillon et les
 * coordonnées dans ce navigateur et ouvre le parcours d'inscription, avec le code du conseiller.
 */
export function PreparedLanding({
  keyValue,
  advisor,
  code,
  companyName,
  siret,
  tradeLabels,
  zone,
  draft,
  prefill,
}: {
  keyValue: string;
  advisor: string | null;
  code: string | null;
  companyName: string | null;
  siret: string;
  tradeLabels: string[];
  zone: string | null;
  draft: ArtisanSignupDraft;
  prefill: PreparedPrefill;
}) {
  const router = useRouter();
  const [forgotten, setForgotten] = useState(false);
  const [pending, startTransition] = useTransition();

  function start() {
    try {
      window.localStorage.setItem(ARTISAN_SIGNUP_DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Stockage indisponible : le parcours repartira du début.
    }
    savePreparedPrefill(prefill);
    const search = new URLSearchParams({ reprendre: "1" });
    if (code) search.set("p", code);
    router.push(`/pro/inscription?${search.toString()}` as Route);
  }

  if (forgotten) {
    return (
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
        <Alert tone="success">{t.forgotten}</Alert>
      </main>
    );
  }

  const rows: [string, string | null][] = [
    [t.rows.company, [companyName, t.siret(formatSiret(siret))].filter(Boolean).join(" · ")],
    [t.rows.trades, tradeLabels.join(", ") || null],
    [t.rows.zone, zone],
    [t.rows.email, prefill.email],
    [t.rows.phone, prefill.phone ? formatPhone(prefill.phone) : null],
  ];

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-8">
      {advisor && (
        <div className="flex items-center gap-3 rounded-card border border-border bg-surface p-4">
          <span className="flex size-11 items-center justify-center rounded-full bg-foreground text-sm font-bold text-surface">
            {advisor.slice(0, 1).toUpperCase()}
          </span>
          <span className="flex flex-col">
            <span className="font-semibold">{t.advisor(advisor)}</span>
            <span className="text-sm text-muted-foreground">{t.advisorText}</span>
          </span>
        </div>
      )}
      <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight">
        {t.title(prefill.firstName)}
      </h1>
      <dl className="flex flex-col rounded-card border border-border bg-surface px-4">
        {rows
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div
              key={label}
              className="flex gap-3 border-t border-border py-3 text-sm first:border-t-0"
            >
              <dt className="w-24 shrink-0 text-muted-foreground">{label}</dt>
              <dd className="font-semibold break-words">{value}</dd>
            </div>
          ))}
      </dl>
      <p className="text-sm text-muted-foreground">{t.fixHint}</p>
      <Button type="button" size="lg" onClick={start}>
        {t.cta}
        <ArrowRight aria-hidden="true" className="size-4" />
      </Button>
      <section className="flex flex-col gap-1.5 rounded-card border border-border bg-surface p-4 text-sm text-label">
        <p className="font-semibold text-foreground">{t.nextTitle}</p>
        <p>{t.nextText}</p>
      </section>
      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Lock aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
        {t.privacy}
      </p>
      <p className="text-sm text-muted-foreground">
        {t.forget}{" "}
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await forgetPreparedSignup(keyValue);
              if (result.status === "ok") setForgotten(true);
            })
          }
          className="font-semibold text-primary-strong hover:underline"
        >
          {t.forgetCta}
        </button>
      </p>
    </main>
  );
}
