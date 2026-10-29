"use client";

import {
  REFERRAL_MONTHS_PER_YEAR,
  referralProgress,
  whatsAppShareUrl,
  type ReferralStep,
} from "@menao/core";
import { Check, Copy, Maximize2, MessageCircle, Printer, ShieldCheck, Star, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { ArtisanPhoto } from "@/components/project/artisan-photo";
import { Button } from "@/components/ui";
import { fr } from "@/i18n/fr";

const h = fr.pro.hub;
const s = h.share;
const t = h.referral;
const dayFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" });

type Qr = { size: number; path: string };
type Tab = "card" | "referral";

const STEP_TONE: Record<ReferralStep, string> = {
  inscription: "text-muted-foreground",
  valide: "text-primary-strong",
  abonne: "text-success",
  annule: "text-muted-foreground",
};

const secondaryLink =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-button border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-background focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none";

export type ShareCardProps = {
  /** Carte de visite : fiche publique d'un artisan validé (ADR 0191). */
  card: {
    url: string;
    qr: Qr;
    name: string;
    company: string | null;
    city: string | null;
    avatarUrl: string | null;
    verified: boolean;
    score: { percent: number; count: number } | null;
  } | null;
  /** Parrainage (F-60, ADR 0137, 0154 et 0161) : artisans validés seulement. */
  referral: {
    link: string;
    code: string;
    joined: number;
    /** Confrères devenus abonnés : le score de fidélité. */
    rewarded: number;
    monthsThisYear: number;
    qr: Qr;
    referrals: { id: string; nom: string; created_at: string; etape: ReferralStep }[];
  } | null;
  /** Onglet ouvert à l'arrivée (`?onglet=parrainage` depuis le tableau de bord). */
  initialTab?: Tab;
};

/**
 * Carte de visite et parrainage dans « Mon profil » sur le site (ADR 0191), comme dans
 * l'application : deux onglets, un « ticket » avec le QR code, et un plein écran pour le montrer.
 * Le site garde son lien à copier, WhatsApp, les mois offerts de l'année (12 au plus), le score
 * de fidélité et le suivi de chaque filleul. Le site peut parler du mois offert ; l'application,
 * jamais (CLAUDE.md règle 10).
 */
export function ShareCard({ card, referral, initialTab = "card" }: ShareCardProps) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [full, setFull] = useState<Tab | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  if (!card && !referral) return null;
  const current: Tab = tab === "card" && card ? "card" : referral ? "referral" : "card";

  function open(which: Tab) {
    setFull(which);
    dialog.current?.showModal();
  }

  return (
    <section
      id="parrainage"
      aria-labelledby="hub-share"
      className="flex scroll-mt-24 flex-col gap-5 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6"
    >
      <h2 id="hub-share" className="sr-only">
        {s.label}
      </h2>
      {card && referral && (
        <div
          role="tablist"
          aria-label={s.label}
          className="flex gap-1 rounded-input bg-background p-1"
        >
          {(["card", "referral"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              id={`partage-${value}`}
              aria-selected={current === value}
              aria-controls="partage-panneau"
              onClick={() => setTab(value)}
              className="flex min-h-10 flex-1 items-center justify-center rounded-[calc(var(--radius-input)-4px)] border border-transparent px-3 text-sm text-muted-foreground transition-colors hover:text-foreground aria-selected:border-primary aria-selected:bg-surface aria-selected:font-medium aria-selected:text-primary-strong"
            >
              {s.tabs[value]}
            </button>
          ))}
        </div>
      )}

      <div
        id="partage-panneau"
        role={card && referral ? "tabpanel" : undefined}
        aria-labelledby={card && referral ? `partage-${current}` : undefined}
        className="flex flex-col gap-5"
      >
        {current === "card" && card ? (
          <CardPanel card={card} onExpand={() => open("card")} />
        ) : referral ? (
          <ReferralPanel referral={referral} onExpand={() => open("referral")} />
        ) : null}
      </div>

      <dialog
        ref={dialog}
        aria-labelledby="partage-plein-ecran"
        onClose={() => setFull(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        className="m-auto w-[min(92vw,30rem)] rounded-hero bg-white p-0 text-foreground backdrop:bg-foreground/60"
      >
        {full && (
          <div className="flex flex-col items-center gap-5 px-6 pt-4 pb-8 text-center">
            <button
              type="button"
              aria-label={s.close}
              onClick={() => dialog.current?.close()}
              className="flex size-11 items-center justify-center self-end rounded-full bg-background hover:bg-border focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
            <h3 id="partage-plein-ecran" className="text-2xl font-medium tracking-tight">
              {full === "card" ? card?.name : s.fullscreen.referral}
            </h3>
            <QrSvg
              qr={(full === "card" ? card?.qr : referral?.qr) ?? { size: 0, path: "" }}
              label={full === "card" ? s.card.qrAlt : t.qrAlt}
              className="aspect-square w-full max-w-[22rem]"
            />
            {full === "referral" && referral && (
              <p className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">{s.referral.orCode}</span>
                <span className="text-3xl font-medium tracking-[0.2em] text-primary-strong">
                  {referral.code.toUpperCase()}
                </span>
              </p>
            )}
            <p className="text-muted-foreground">
              {full === "card" ? s.fullscreen.cardHint : s.fullscreen.referralHint}
            </p>
          </div>
        )}
      </dialog>
    </section>
  );
}

function CardPanel({
  card,
  onExpand,
}: {
  card: NonNullable<ShareCardProps["card"]>;
  onExpand: () => void;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-[minmax(0,19rem)_1fr] sm:items-center">
      <div className="flex flex-col items-center gap-3 rounded-hero bg-primary-softer p-5">
        <div className="flex w-full items-center gap-3">
          <ArtisanPhoto
            url={card.avatarUrl}
            name={card.name}
            className="size-12 shrink-0 rounded-full"
            initialsClassName="text-base"
          />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[1.0625rem] font-medium">{card.name}</span>
            {(card.company || card.city) && (
              <span className="truncate text-sm text-muted-foreground">
                {[card.company, card.city].filter(Boolean).join(" · ")}
              </span>
            )}
          </div>
        </div>
        {(card.verified || card.score) && (
          <div className="flex w-full flex-wrap gap-1.5">
            {card.verified && (
              <span className="inline-flex items-center gap-1 rounded-chip bg-success-soft px-2 py-1 text-xs font-medium text-success">
                <ShieldCheck aria-hidden="true" className="size-3.5" />
                {h.verified}
              </span>
            )}
            {card.score && (
              <span className="inline-flex items-center gap-1 rounded-chip bg-primary-soft px-2 py-1 text-xs font-medium text-primary-strong">
                <Star aria-hidden="true" className="size-3.5" />
                {h.score(card.score.percent, card.score.count)}
              </span>
            )}
          </div>
        )}
        <QrTile qr={card.qr} label={s.card.qrAlt} onExpand={onExpand} />
        <span className="max-w-full truncate text-sm font-medium text-primary-strong">
          {card.url.replace(/^https?:\/\//, "")}
        </span>
      </div>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{s.card.hint}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" block={false} onClick={onExpand}>
            <Maximize2 aria-hidden="true" className="size-4" />
            {s.expand}
          </Button>
          <CopyButton text={card.url} />
          <a
            href={whatsAppShareUrl(s.card.shareMessage(card.name, card.url))}
            target="_blank"
            rel="noopener noreferrer"
            className={secondaryLink}
          >
            <MessageCircle aria-hidden="true" className="size-4" />
            {t.whatsApp}
          </a>
        </div>
        <Link
          href="/pro/cartes-de-visite"
          className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-primary-strong underline-offset-4 hover:underline"
        >
          <Printer aria-hidden="true" className="size-4" />
          {s.card.print}
        </Link>
      </div>
    </div>
  );
}

function ReferralPanel({
  referral,
  onExpand,
}: {
  referral: NonNullable<ShareCardProps["referral"]>;
  onExpand: () => void;
}) {
  const progress = referralProgress(referral.monthsThisYear);
  const code = referral.code.toUpperCase();
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-[minmax(0,19rem)_1fr] sm:items-center">
        <div className="flex flex-col items-center gap-3 rounded-hero bg-primary-softer p-5">
          <span className="text-[1.0625rem] font-medium">{t.title}</span>
          <QrTile qr={referral.qr} label={t.qrAlt} onExpand={onExpand} />
          <p className="flex flex-col items-center gap-0.5">
            <span className="text-xs text-muted-foreground">{s.referral.orCode}</span>
            <span className="text-2xl font-medium tracking-[0.15em] text-primary-strong select-all">
              {code}
            </span>
          </p>
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <p className="text-sm text-muted-foreground">{t.lead}</p>
          <p className="text-sm text-muted-foreground">{s.referral.hint}</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label htmlFor="lien-parrainage" className="sr-only">
              {t.linkLabel}
            </label>
            <input
              id="lien-parrainage"
              readOnly
              value={referral.link}
              onFocus={(e) => e.currentTarget.select()}
              className="min-h-11 min-w-0 flex-1 rounded-input border border-border bg-surface px-3 text-sm"
            />
            <CopyButton text={referral.link} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" block={false} onClick={onExpand}>
              <Maximize2 aria-hidden="true" className="size-4" />
              {s.expand}
            </Button>
            <a
              href={whatsAppShareUrl(t.shareMessage(referral.link, code))}
              target="_blank"
              rel="noopener noreferrer"
              className={secondaryLink}
            >
              <MessageCircle aria-hidden="true" className="size-4" />
              {t.whatsApp}
            </a>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1" aria-live="polite">
        <p className="text-sm font-medium">
          {t.joined(referral.joined)}
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
          <span className="font-medium">{t.loyalty(referral.rewarded)}</span>
          <span className="text-muted-foreground"> · {t.loyaltyHint}</span>
        </p>
      </div>
      {referral.referrals.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">{t.listTitle}</h3>
          <ul className="overflow-hidden rounded-input border border-border bg-surface">
            {referral.referrals.map((row) => (
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
    </>
  );
}

/** QR code sur sa tuile blanche ; un clic l'agrandit. */
function QrTile({ qr, label, onExpand }: { qr: Qr; label: string; onExpand: () => void }) {
  return (
    <button
      type="button"
      aria-label={`${label}, ${s.expand}`}
      onClick={onExpand}
      className="rounded-card bg-white p-2 transition-opacity hover:opacity-90 focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
    >
      <QrSvg qr={qr} label={label} className="size-44" />
    </button>
  );
}

export function QrSvg({ qr, label, className }: { qr: Qr; label: string; className: string }) {
  return (
    <svg
      viewBox={`0 0 ${qr.size} ${qr.size}`}
      role="img"
      aria-label={label}
      className={`bg-white ${className}`}
      shapeRendering="crispEdges"
    >
      <path d={qr.path} fill="#111728" />
    </svg>
  );
}

/** « Copier le lien » ; le lien reste sélectionnable si le navigateur refuse la copie. */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Copie refusée par le navigateur.
    }
  }
  return (
    <Button type="button" variant="secondary" block={false} onClick={copy}>
      {copied ? (
        <Check aria-hidden="true" className="size-4" />
      ) : (
        <Copy aria-hidden="true" className="size-4" />
      )}
      {copied ? t.copied : t.copy}
    </Button>
  );
}
