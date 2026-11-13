import type { ClientChantierAction } from "@menao/core";
import { CreditCard, FilePen } from "lucide-react";
import type { Route } from "next";
import { ButtonLink } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.chantier.action;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

/**
 * Action attendue du client (maquettes « Mes chantiers ») : signer le devis reçu, payer l'acompte
 * une fois le devis signé, le paiement au démarrage pendant les travaux (F-146, carte violette du
 * lot 40), puis le solde une fois le chantier réceptionné (F-32).
 */
export function ChantierActionBlock({
  action,
  totalTtcCents,
  chantierId,
  startPercent = null,
}: {
  action: ClientChantierAction;
  totalTtcCents: number | null;
  chantierId: string;
  /** Part prévue au démarrage, pour la carte du paiement au démarrage. */
  startPercent?: number | null;
}) {
  if (action.kind === "payer_demarrage") {
    return (
      <section
        aria-label={t.startTitle}
        className="flex flex-col gap-2 rounded-card bg-violet-soft p-4 sm:p-5"
      >
        <span className="self-start rounded-pill bg-violet px-2.5 py-1 text-xs font-semibold text-surface">
          {t.startChip}
        </span>
        <h2 className="text-lg font-bold">{t.startTitle}</h2>
        {startPercent !== null && <p className="text-sm text-label">{t.startText(startPercent)}</p>}
        <span className="font-display text-[1.75rem] leading-none font-bold tracking-tight">
          {euros.format(action.amountCents / 100)}
        </span>
        <ButtonLink
          href={`/mon-espace/chantiers/${chantierId}/demarrage` as Route}
          size="lg"
          block
          className="mt-1"
        >
          {fr.startPayment.submit(euros.format(action.amountCents / 100))}
        </ButtonLink>
      </section>
    );
  }
  const sign = action.kind === "signer_devis";
  const href =
    action.kind === "payer_solde"
      ? `/mon-espace/chantiers/${chantierId}/solde`
      : action.kind === "payer_acompte"
        ? `/mon-espace/devis/${action.quoteId}/acompte`
        : `/mon-espace/devis/${action.quoteId}`;
  return (
    <section
      aria-label={sign ? t.signTitle : t.payTitle}
      className="flex flex-col gap-3 rounded-card border border-primary/50 bg-surface p-4 shadow-card sm:p-5"
    >
      <div className="flex flex-col gap-0.5">
        <p className="flex items-center gap-2 text-sm font-medium text-primary-strong">
          {sign ? (
            <FilePen aria-hidden="true" className="size-4" />
          ) : (
            <CreditCard aria-hidden="true" className="size-4" />
          )}
          {sign ? t.signTitle : t.payTitle}
        </p>
        <p className="text-xs text-muted-foreground">
          {sign ? t.signText : action.kind === "payer_solde" ? t.payBalanceText : t.payText}
        </p>
      </div>
      {action.kind !== "signer_devis" && (
        <dl className="flex flex-col gap-1 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt>{t.payNow}</dt>
            <dd className="font-medium">{euros.format(action.amountCents / 100)}</dd>
          </div>
          {totalTtcCents !== null && (
            <div className="flex items-center justify-between gap-3 text-muted-foreground">
              <dt>{t.total}</dt>
              <dd>{euros.format(totalTtcCents / 100)}</dd>
            </div>
          )}
        </dl>
      )}
      <ButtonLink href={href as Route} size="lg" block>
        {sign ? t.sign : t.pay}
      </ButtonLink>
    </section>
  );
}
