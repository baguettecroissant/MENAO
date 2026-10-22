"use client";

import {
  REFERRAL_MONTHS_PER_YEAR,
  referralProgress,
  whatsAppShareUrl,
  type ReferralStep,
} from "@menao/core";
import { Check, Copy, Gift, MessageCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.pro.hub.referral;
const dayFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" });

const STEP_TONE: Record<ReferralStep, string> = {
  inscription: "text-muted-foreground",
  valide: "text-primary-strong",
  abonne: "text-success",
  annule: "text-muted-foreground",
};

/**
 * Parrainage (F-60, ADR 0137, 0154 et 0161) dans « Mon profil » sur le site : lien à copier, QR
 * code à faire scanner, message WhatsApp déjà rédigé, code à dicter, bilan (mois offerts de
 * l'année, 12 au plus ; score de fidélité) et suivi de chaque filleul. Le site peut parler du mois
 * offert ; l'application, jamais (CLAUDE.md règle 10).
 */
export function ReferralCard({
  link,
  code,
  joined,
  rewarded,
  monthsThisYear,
  qr,
  referrals,
}: {
  link: string;
  code: string;
  joined: number;
  /** Confrères devenus abonnés : le score de fidélité. */
  rewarded: number;
  monthsThisYear: number;
  /** QR code du lien, calculé côté serveur. */
  qr: { size: number; path: string };
  referrals: { id: string; nom: string; created_at: string; etape: ReferralStep }[];
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
      id="parrainage"
      aria-labelledby="hub-referral"
      className="flex scroll-mt-24 flex-col gap-4 rounded-card border border-primary-soft bg-primary-softer p-5 sm:p-6"
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
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label htmlFor="lien-parrainage" className="sr-only">
              {t.linkLabel}
            </label>
            <input
              id="lien-parrainage"
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              className="min-h-11 min-w-0 flex-1 rounded-input border border-border bg-surface px-3 text-sm"
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
          <a
            href={whatsAppShareUrl(t.shareMessage(link, code.toUpperCase()))}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-button border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-background focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
          >
            <MessageCircle aria-hidden="true" className="size-4" />
            {t.whatsApp}
          </a>
          <p className="text-xs text-muted-foreground">{t.codeHint(code)}</p>
        </div>
        <figure className="flex flex-col items-center gap-1.5 self-center sm:self-start">
          <svg
            viewBox={`0 0 ${qr.size} ${qr.size}`}
            role="img"
            aria-label={t.qrAlt}
            className="size-32 rounded-input border border-border bg-white"
            shapeRendering="crispEdges"
          >
            <path d={qr.path} fill="#111728" />
          </svg>
          <figcaption className="max-w-40 text-center text-xs text-muted-foreground">
            {t.qrHint}
          </figcaption>
        </figure>
      </div>
      <div className="flex flex-col gap-1" aria-live="polite">
        <p className="text-sm font-medium">
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
        <p className="text-sm">
          <span className="font-medium">{t.loyalty(rewarded)}</span>
          <span className="text-muted-foreground"> · {t.loyaltyHint}</span>
        </p>
      </div>
      {referrals.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">{t.listTitle}</h3>
          <ul className="overflow-hidden rounded-input border border-border bg-surface">
            {referrals.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-0.5 border-t border-border px-3 py-2.5 text-sm first:border-t-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{row.nom}</span>
                  <span className="text-xs text-muted-foreground">
                    {t.joinedOn(dayFormat.format(new Date(row.created_at)))}
                  </span>
                </span>
                <span className={`shrink-0 text-sm font-medium ${STEP_TONE[row.etape]}`}>
                  {t.steps[row.etape]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
