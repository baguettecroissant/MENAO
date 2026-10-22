"use client";

import { REFERRAL_MONTHS_PER_YEAR, referralProgress } from "@menao/core";
import { Check, Copy, Gift } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.pro.hub.referral;

/**
 * Parrainage (F-60, ADR 0137 et 0154) dans « Mon profil » sur le site : lien à copier, code à
 * dicter et bilan, dont les mois offerts de l'année (12 au plus). Le site peut parler du mois
 * offert ; l'application, jamais (CLAUDE.md règle 10).
 */
export function ReferralCard({
  link,
  code,
  joined,
  monthsThisYear,
}: {
  link: string;
  code: string;
  joined: number;
  monthsThisYear: number;
}) {
  const [copied, setCopied] = useState(false);
  const progress = referralProgress(monthsThisYear);
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Copie refusée par le navigateur : le lien reste sélectionnable.
    }
  }
  return (
    <section
      aria-labelledby="hub-referral"
      className="flex flex-col gap-4 rounded-card border border-primary-soft bg-primary-softer p-5 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface text-primary shadow-card">
          <Gift aria-hidden="true" className="size-5" />
        </span>
        <div className="flex flex-col gap-0.5">
          <h2 id="hub-referral" className="text-[1.0625rem] font-medium">
            {t.title}
          </h2>
          <p className="text-sm text-muted-foreground">{t.lead}</p>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label htmlFor="lien-parrainage" className="sr-only">
          {t.linkLabel}
        </label>
        <input
          id="lien-parrainage"
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          className="min-h-11 flex-1 rounded-input border border-border bg-surface px-3 text-sm"
        />
        <Button type="button" variant="secondary" block={false} onClick={copy}>
          {copied ? (
            <Check aria-hidden="true" className="size-4" />
          ) : (
            <Copy aria-hidden="true" className="size-4" />
          )}
          {copied ? t.copied : t.copy}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{t.codeHint(code)}</p>
      <p className="text-sm font-medium" aria-live="polite">
        {t.joined(joined)}
        {progress.earned > 0 && !progress.capped && (
          <span className="text-success">
            {" · "}
            {t.thisYear(progress.earned, REFERRAL_MONTHS_PER_YEAR)}
          </span>
        )}
      </p>
      {progress.capped && (
        <p className="text-sm text-success">{t.capped(REFERRAL_MONTHS_PER_YEAR)}</p>
      )}
    </section>
  );
}
