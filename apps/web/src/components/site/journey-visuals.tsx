import {
  CalendarCheck,
  Camera,
  Check,
  CircleCheck,
  CreditCard,
  LockKeyhole,
  MailCheck,
  Mic,
  Phone,
  ShieldCheck,
  Signature,
  Sparkles,
  Star,
} from "lucide-react";
import { fr } from "@/i18n/fr";

const t = fr.site.journey;

/**
 * Illustrations du parcours client (valeurs d'exemple), dessinées en HTML pour rester nettes et
 * légères. Chacune est une image unique pour les lecteurs d'écran.
 */

/** Devis détaillé à signer en ligne. */
export function QuoteSignVisual() {
  return (
    <div role="img" aria-label={t.quoteLabel} className="relative w-full">
      <div aria-hidden="true" className="rounded-card bg-surface text-foreground p-5 shadow-raised">
        <div className="flex items-center justify-between gap-3">
          <p className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Signature className="size-4" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-sm font-medium">{t.quote}</span>
              <span className="truncate text-xs text-muted-foreground">{t.quoteNumber}</span>
            </span>
          </p>
          <span className="shrink-0 rounded-chip bg-primary-soft px-2 py-1 text-xs font-medium whitespace-nowrap text-primary-strong">
            {fr.chantier.steps.signature}
          </span>
        </div>
        <ul className="mt-4 flex flex-col gap-2.5 border-t border-border pt-4 text-sm">
          {t.quoteLines.map((line) => (
            <li key={line.label} className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 text-foreground/85">{line.label}</span>
              <span className="shrink-0 tabular-nums">{line.amount}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
          <span className="text-sm text-muted-foreground">{t.quoteTotalLabel}</span>
          <span className="text-xl font-medium tracking-tight tabular-nums">{t.quoteTotal}</span>
        </p>
        <span className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-button bg-primary text-sm font-medium text-primary-foreground">
          <Signature className="size-4" />
          {t.quoteSign}
        </span>
      </div>
      <span
        aria-hidden="true"
        className="absolute -top-3 -right-2 inline-flex animate-menao-float items-center gap-1.5 rounded-pill bg-success px-3 py-1.5 text-xs font-medium whitespace-nowrap text-white shadow-raised sm:-right-4"
      >
        <MailCheck className="size-3.5" />
        {t.quoteCode}
      </span>
    </div>
  );
}

/** Acompte payé par carte, versé directement à l'artisan. */
export function PaymentVisual() {
  return (
    <div
      role="img"
      aria-label={t.paymentLabel}
      className="w-full rounded-card bg-surface text-foreground p-5 shadow-raised"
    >
      <div aria-hidden="true" className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">{t.payment}</span>
          <span className="text-xl font-medium tracking-tight tabular-nums">{t.paymentAmount}</span>
        </div>
        <div className="flex items-center gap-3 rounded-input border border-border bg-input px-3 py-2.5 text-sm">
          <CreditCard className="size-4 text-muted-foreground" />
          {t.paymentCard}
          <span className="ml-auto tracking-[0.2em] text-muted-foreground">•••• ••••</span>
        </div>
        <p className="flex items-center gap-2 text-xs font-medium text-primary-strong">
          <LockKeyhole className="size-3.5" />
          {t.paymentSecure}
        </p>
        <p className="flex items-center gap-2 rounded-pill bg-success-soft px-3 py-2 text-xs font-medium text-success">
          <CircleCheck className="size-3.5 shrink-0" />
          {t.paymentDirect}
        </p>
      </div>
    </div>
  );
}

const STEPS = ["signature", "paiement", "planification", "travaux", "reception"] as const;

/** Avancement du chantier (étapes de l'espace client) et photo partagée par l'artisan. */
export function ProgressVisual() {
  const current = 3;
  return (
    <div role="img" aria-label={t.progressLabel} className="flex w-full flex-col gap-3">
      <div
        aria-hidden="true"
        className="rounded-card bg-surface text-foreground px-4 py-5 shadow-raised"
      >
        <ol className="flex items-start justify-between">
          {STEPS.map((step, i) => (
            <li key={step} className="relative flex flex-1 flex-col items-center gap-1.5">
              {i > 0 && (
                <span
                  className={`absolute top-3 right-1/2 left-[-50%] h-0.5 ${i <= current ? "bg-primary" : "bg-border"}`}
                />
              )}
              <span
                className={`relative flex size-6 items-center justify-center rounded-full border-2 ${
                  i < current
                    ? "border-primary bg-primary text-primary-foreground"
                    : i === current
                      ? "border-primary bg-surface"
                      : "border-border bg-surface"
                }`}
              >
                {i < current ? (
                  <Check className="size-3.5" />
                ) : i === current ? (
                  <span className="size-2 rounded-full bg-primary" />
                ) : null}
              </span>
              <span
                className={`text-center text-[0.625rem] leading-tight tracking-tight ${i === current ? "font-medium text-primary-strong" : "text-muted-foreground"}`}
              >
                {fr.chantier.steps[step]}
              </span>
            </li>
          ))}
        </ol>
      </div>
      <div
        aria-hidden="true"
        className="flex items-center gap-3 self-end rounded-card bg-surface text-foreground p-2.5 pr-4 shadow-raised"
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#dfe6fe_0%,#b9c7fc_55%,#8ea4fb_100%)] text-primary-strong">
          <Camera className="size-5" />
        </span>
        <span className="flex flex-col">
          <span className="text-xs font-medium">{t.progressPhoto}</span>
          <span className="text-xs text-muted-foreground">
            {t.progressCaption} · {t.progressWhen}
          </span>
        </span>
      </div>
    </div>
  );
}

/** Signature du procès-verbal de réception. */
export function ReceptionVisual() {
  return (
    <div
      role="img"
      aria-label={t.receptionLabel}
      className="w-full rounded-card bg-surface text-foreground p-4 shadow-raised"
    >
      <div aria-hidden="true" className="flex flex-col gap-3">
        <p className="text-sm font-medium">{t.reception}</p>
        <div className="grid grid-cols-2 gap-2 text-xs font-medium">
          <span className="flex items-center gap-1.5 rounded-input border-2 border-primary bg-primary-softer px-2.5 py-2 text-primary-strong">
            <span className="flex size-3.5 items-center justify-center rounded-full border-2 border-primary">
              <span className="size-1.5 rounded-full bg-primary" />
            </span>
            {t.receptionWithout}
          </span>
          <span className="flex items-center gap-1.5 rounded-input border border-border px-2.5 py-2 text-muted-foreground">
            <span className="size-3.5 rounded-full border-2 border-border-strong" />
            {t.receptionWith}
          </span>
        </div>
        <span className="flex min-h-9 items-center justify-center rounded-button bg-primary text-xs font-medium text-primary-foreground">
          {t.receptionSign}
        </span>
      </div>
    </div>
  );
}

const REVIEW_CRITERIA = ["quality", "delays", "communication"] as const;
const REVIEW_LEVELS = [92, 84, 88];

/** Formulaire d'avis (critères de l'avis MENAO), ouvert après la réception. */
export function ReviewVisual() {
  return (
    <div
      role="img"
      aria-label={t.reviewLabel}
      className="w-full rounded-card bg-surface text-foreground p-4 shadow-raised"
    >
      <div aria-hidden="true" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="flex gap-0.5">
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} className="size-4 fill-primary text-primary" />
            ))}
          </span>
          <span className="inline-flex items-center gap-1 rounded-chip bg-success-soft px-2 py-0.5 text-[0.6875rem] font-medium text-success">
            <CircleCheck className="size-3" />
            {t.reviewBadge}
          </span>
        </div>
        <ul className="flex flex-col gap-2">
          {REVIEW_CRITERIA.map((criterion, i) => (
            <li key={criterion} className="flex flex-col gap-1">
              <span className="text-[0.6875rem] text-muted-foreground">
                {fr.review.criteria[criterion]}
              </span>
              <span className="h-1.5 rounded-full bg-background">
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{ width: `${REVIEW_LEVELS[i]}%` }}
                />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Projet décrit avec ses mots et ses photos, puis analysé par l'assistant. */
export function DescribeVisual() {
  return (
    <div role="img" aria-label={t.describeLabel} className="flex w-full flex-col gap-3">
      <div
        aria-hidden="true"
        className="rounded-card border-2 border-primary/60 bg-surface text-foreground p-4 shadow-raised"
      >
        <p className="text-sm leading-relaxed">{t.describeText}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-background px-3 py-1.5 text-xs text-muted-foreground">
            <Camera className="size-3.5" />
            {t.describePhotos}
          </span>
          <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Mic className="size-4" />
          </span>
        </div>
      </div>
      <div aria-hidden="true" className="rounded-card bg-surface text-foreground p-4 shadow-raised">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-primary-strong">
          <Sparkles className="size-3.5" />
          {t.describeAnalysis}
        </p>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {t.describeChips.map((chip) => (
            <li
              key={chip}
              className="rounded-chip bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary-strong"
            >
              {chip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Sélection de deux artisans vérifiés parmi ceux proposés. */
export function ChooseVisual() {
  return (
    <div
      role="img"
      aria-label={t.chooseLabel}
      className="w-full rounded-card bg-surface text-foreground p-4 shadow-raised"
    >
      <div aria-hidden="true" className="flex flex-col gap-2.5">
        <p className="text-xs font-semibold text-muted-foreground">{t.chooseTitle}</p>
        {t.chooseRows.map((row) => (
          <div
            key={row.initial}
            className={`flex items-center gap-3 rounded-input border px-3 py-2.5 ${
              row.selected ? "border-primary bg-primary-softer" : "border-border"
            }`}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#dfe6fe_0%,#b9c7fc_55%,#8ea4fb_100%)] text-sm font-medium text-primary-strong">
              {row.initial}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">{row.detail}</span>
              <span className="inline-flex items-center gap-1 text-xs text-success">
                <ShieldCheck className="size-3" />
                {t.chooseVerified}
              </span>
            </span>
            <span
              className={`flex size-5 shrink-0 items-center justify-center rounded-md border-2 ${
                row.selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border-strong"
              }`}
            >
              {row.selected && <Check className="size-3.5" />}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Demande acceptée et rendez-vous de visite du chantier. */
export function MeetVisual() {
  return (
    <div role="img" aria-label={t.meetLabel} className="flex w-full flex-col gap-3">
      <p
        aria-hidden="true"
        className="inline-flex items-center gap-2 self-start rounded-pill bg-success px-3.5 py-2 text-sm font-medium text-white shadow-raised"
      >
        <CircleCheck className="size-4" />
        {t.meetAccepted}
      </p>
      <div aria-hidden="true" className="rounded-card bg-surface text-foreground p-4 shadow-raised">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <CalendarCheck className="size-5" />
          </span>
          <span className="flex flex-col">
            <span className="text-sm font-medium">{t.meetTitle}</span>
            <span className="text-xs text-muted-foreground">{t.meetDetail}</span>
          </span>
        </div>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-chip bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary-strong">
          <Phone className="size-3.5" />
          {t.meetShared}
        </p>
      </div>
    </div>
  );
}
