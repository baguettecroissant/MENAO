import {
  ArrowRight,
  CircleCheck,
  CreditCard,
  HardHat,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { Fragment } from "react";
import { fr } from "@/i18n/fr";

const t = fr.pages.guarantees;

/** Dossier artisan et ses contrôles (illustration du bandeau « Garanties & Confiance »). */
export function VerificationCard() {
  const c = t.card;
  return (
    <div role="img" aria-label={c.label} className="relative mx-auto w-full max-w-sm">
      <div aria-hidden="true" className="absolute -inset-8 rounded-[3rem] bg-white/10 blur-3xl" />
      <div
        aria-hidden="true"
        className="relative rounded-card bg-surface p-5 text-foreground shadow-raised"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2.5 font-medium">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <ShieldCheck className="size-5" />
            </span>
            {c.title}
          </p>
          <span className="inline-flex items-center gap-1.5 rounded-chip bg-success-soft px-2 py-1 text-xs font-medium text-success">
            <span className="size-1.5 rounded-full bg-current" />
            {c.status}
          </span>
        </div>
        <ul className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
          {c.checks.map((check) => (
            <li key={check} className="flex items-center gap-2.5 text-sm">
              <CircleCheck className="size-4 shrink-0 text-success" />
              {check}
            </li>
          ))}
        </ul>
        <p className="mt-4 flex items-center gap-2 rounded-input bg-primary-softer px-3 py-2 text-xs font-medium text-primary-strong">
          <ShieldCheck className="size-3.5" />
          {c.footer}
        </p>
      </div>
    </div>
  );
}

/** Schéma du paiement : votre carte, Stripe, le compte de l'artisan ; rien ne passe par MENAO. */
export function PaymentFlow() {
  const p = t.paymentFlow;
  const nodes = [
    { icon: CreditCard, title: p.you, detail: p.youDetail },
    { icon: LockKeyhole, title: p.stripe, detail: p.stripeDetail },
    { icon: HardHat, title: p.artisan, detail: p.artisanDetail },
  ];
  return (
    <div role="img" aria-label={p.label} className="flex w-full flex-col gap-4">
      <ol
        aria-hidden="true"
        className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center"
      >
        {nodes.map((node, i) => {
          const Icon = node.icon;
          return (
            <Fragment key={node.title}>
              {i > 0 && (
                <li className="flex justify-center">
                  <ArrowRight className="size-5 shrink-0 rotate-90 text-white/70 sm:rotate-0" />
                </li>
              )}
              <li className="sm:flex-1">
                <span className="flex w-full flex-col items-center gap-2 rounded-card bg-surface px-4 py-5 text-center text-foreground shadow-raised">
                  <span className="flex size-11 items-center justify-center rounded-full bg-primary-soft text-primary">
                    <Icon className="size-5" />
                  </span>
                  <span className="font-medium">{node.title}</span>
                  <span className="text-xs text-muted-foreground">{node.detail}</span>
                </span>
              </li>
            </Fragment>
          );
        })}
      </ol>
      <p
        aria-hidden="true"
        className="self-center rounded-pill border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur"
      >
        {p.menao}
      </p>
    </div>
  );
}
