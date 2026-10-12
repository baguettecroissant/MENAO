import type { ConnectAccountStatus, ConnectRequirementGroup } from "@menao/core";
import { CircleCheck, Clock, ExternalLink, ListChecks, ShieldAlert } from "lucide-react";
import { Alert, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { ConnectButton } from "./connect-button";

const t = fr.pro.onboarding.connect;

/**
 * État du compte de paiement et prochaine action (F-14) : démarrer, compléter les rubriques que
 * Stripe attend encore (avec la date limite), patienter pendant sa vérification, ou contacter
 * l'équipe si le compte est refusé.
 */
export function ConnectStatusPanel({
  status,
  payoutsEnabled,
  due,
  pending,
  deadline,
}: {
  status: ConnectAccountStatus;
  payoutsEnabled: boolean;
  /** Rubriques des informations encore demandées. */
  due: readonly ConnectRequirementGroup[];
  /** Rubriques transmises, en cours de vérification. */
  pending: readonly ConnectRequirementGroup[];
  /** Date limite déjà mise en forme (« 18 octobre 2026 »), si Stripe en fixe une. */
  deadline: string | null;
}) {
  const note = deadline ? t.deadline(deadline) : null;
  switch (status) {
    case "actif":
      return (
        <>
          <Alert tone="success">{t.active}</Alert>
          {!payoutsEnabled &&
            (due.length > 0 ? (
              <>
                <RequirementList title={t.duePayoutsTitle} groups={due} note={note} />
                <ConnectButton label={t.complete} />
              </>
            ) : (
              <p className="text-muted-foreground">{t.payoutsPending}</p>
            ))}
          <a
            href="https://dashboard.stripe.com/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 self-start font-medium text-primary-strong underline-offset-2 hover:underline"
          >
            {t.dashboard}
            <ExternalLink aria-hidden="true" className="size-4" />
          </a>
        </>
      );
    case "a_demarrer":
      return (
        <>
          <p>{t.intro}</p>
          <p className="text-sm text-muted-foreground">{t.fees}</p>
          <ConnectButton label={t.start} />
        </>
      );
    case "a_completer":
      return (
        <>
          {due.length > 0 ? (
            <RequirementList title={t.dueTitle} groups={due} note={note} />
          ) : (
            <p>{t.intro}</p>
          )}
          <ConnectButton label={due.length > 0 ? t.complete : t.resume} />
          <p className="text-sm text-muted-foreground">{t.fees}</p>
        </>
      );
    case "verification":
      return (
        <>
          <p
            role="status"
            className="flex items-start gap-3 rounded-input bg-primary-softer px-4 py-3 text-sm text-primary-strong"
          >
            <Clock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {t.verifying}
          </p>
          {pending.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">{t.verifyingItems}</p>
              <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                {pending.map((group) => (
                  <li key={group} className="flex items-start gap-2">
                    <CircleCheck
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-primary"
                    />
                    {t.groups[group]}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <TextLink href="/pro/onboarding/paiements?retour=1" className="self-start text-sm">
            {t.check}
          </TextLink>
        </>
      );
    case "refuse":
      return (
        <>
          <p
            role="alert"
            className="flex items-start gap-3 rounded-input bg-danger-soft px-4 py-3 text-sm text-danger"
          >
            <ShieldAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {t.refused}
          </p>
          <TextLink href="/contact" className="self-start">
            {t.contact}
          </TextLink>
        </>
      );
  }
}

/** Rubriques des informations encore demandées par Stripe, avec la date limite éventuelle. */
function RequirementList({
  title,
  groups,
  note,
}: {
  title: string;
  groups: readonly ConnectRequirementGroup[];
  note: string | null;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-input border border-warning/30 bg-warning-soft px-4 py-3">
      <p className="flex items-start gap-2 text-sm font-medium text-warning">
        <ListChecks aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        {title}
      </p>
      <ul className="flex list-disc flex-col gap-1 pl-10 text-sm text-foreground/85">
        {groups.map((group) => (
          <li key={group}>{t.groups[group]}</li>
        ))}
      </ul>
      {note && <p className="pl-6 text-xs font-medium text-warning">{note}</p>}
    </div>
  );
}
