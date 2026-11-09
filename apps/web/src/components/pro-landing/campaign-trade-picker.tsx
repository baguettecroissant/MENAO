"use client";

import { ArrowRight, Check, LockKeyhole } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonClasses, focusRing } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { useSignupDraft } from "@/lib/artisan/signup-draft";
import { usePartnerCode } from "@/lib/partners/use-partner-code";

const t = fr.pro.landing.campaign;
const VISIBLE = 8;

/**
 * Première étape de l'inscription dans le bandeau de la page d'atterrissage (ADR 0266) : le métier
 * choisi rejoint le brouillon d'inscription (gardé dans le navigateur, ADR 0110), puis le parcours
 * reprend à l'étape suivante, avec le code du lien suivi.
 */
export function CampaignTradePicker({
  trades,
}: {
  trades: readonly { code: string; label: string }[];
}) {
  const router = useRouter();
  const { draft, update } = useSignupDraft();
  const code = usePartnerCode();
  const [all, setAll] = useState(false);
  const chosen = draft.tradeCodes;
  const shown = all ? trades : trades.slice(0, VISIBLE);

  function toggle(tradeCode: string) {
    update({
      tradeCodes: chosen.includes(tradeCode)
        ? chosen.filter((c) => c !== tradeCode)
        : [...chosen, tradeCode],
    });
  }

  function next() {
    const params = new URLSearchParams({ reprendre: "1" });
    if (code) params.set("p", code);
    router.push(`/pro/inscription?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-4 rounded-[1.5rem] bg-surface p-5 text-foreground shadow-raised sm:p-7">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-bold tracking-[0.08em] text-primary-strong uppercase">
          {t.step}
        </p>
        <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">{t.question}</h2>
      </div>
      <ul aria-label={t.tradesLabel} className="flex flex-wrap gap-2">
        {shown.map((trade) => {
          const on = chosen.includes(trade.code);
          return (
            <li key={trade.code}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => toggle(trade.code)}
                className={`inline-flex min-h-10 items-center gap-1.5 rounded-pill border px-3.5 text-sm font-semibold transition-colors ${focusRing} ${
                  on
                    ? "border-primary bg-primary-soft text-primary-strong"
                    : "border-border bg-surface hover:border-border-strong"
                }`}
              >
                {on && <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />}
                {trade.label}
              </button>
            </li>
          );
        })}
        {!all && trades.length > VISIBLE && (
          <li>
            <button
              type="button"
              onClick={() => setAll(true)}
              className={`inline-flex min-h-10 items-center rounded-pill px-3.5 text-sm font-semibold text-muted-foreground hover:text-foreground ${focusRing}`}
            >
              {t.more(trades.length - VISIBLE)}
            </button>
          </li>
        )}
      </ul>
      <button
        type="button"
        onClick={next}
        disabled={chosen.length === 0}
        className={`inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-button bg-primary px-6 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:bg-border-strong disabled:text-muted-foreground ${focusRing}`}
      >
        {t.continue(chosen.length)}
        {chosen.length > 0 && <ArrowRight aria-hidden="true" className="size-4" />}
      </button>
      <div className="flex flex-wrap justify-between gap-2 text-[0.8125rem] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <LockKeyhole aria-hidden="true" className="size-3.5" />
          {t.noPay}
        </span>
        <span>
          {t.already}{" "}
          <Link href="/connexion" className="font-semibold text-primary-strong hover:underline">
            {t.signIn}
          </Link>
        </span>
      </div>
    </div>
  );
}

/** Lien d'inscription qui garde le code du lien suivi (`?p=`), pour les boutons de la page. */
export function CampaignSignupLink({
  block = false,
  arrow = false,
}: {
  block?: boolean;
  arrow?: boolean;
}) {
  const code = usePartnerCode();
  const href = code ? `/pro/inscription?p=${encodeURIComponent(code)}` : "/pro/inscription";
  return (
    <Link href={href as Route} className={buttonClasses({ size: "lg", block })}>
      {fr.pro.landing.hero.signUp}
      {arrow && <ArrowRight aria-hidden="true" className="size-4" />}
    </Link>
  );
}
