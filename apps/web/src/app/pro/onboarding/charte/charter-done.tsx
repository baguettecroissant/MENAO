import { CHARTER_RULES, CHARTER_TEXT, ENGAGEMENT_VERSION } from "@menao/core";
import { ArrowRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { CHARTER_TOTAL, HexBadge } from "@/components/pro/charter/charter-parts";
import { fr } from "@/i18n/fr";

const t = fr.pro.onboarding.charter;
const T = CHARTER_TEXT;
const PARIS = "Europe/Paris";

/** Écran de bienvenue après la signature de la charte (ADR 0104), avec le récapitulatif. */
export function CharterDone({
  charter,
  continueHref,
  continueLabel,
  rereadHref,
}: {
  charter: { signer_name: string; company: string; siret: string; accepted_at: string };
  /** Suite : documents de l'inscription, ou espace pro pour un artisan déjà inscrit. */
  continueHref: string;
  continueLabel: string;
  rereadHref: string;
}) {
  const signedAt = new Date(charter.accepted_at);
  const date = signedAt.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: PARIS,
  });
  const time = signedAt.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: PARIS,
  });
  const recap: [string, string][] = [
    [t.recap.company, charter.company],
    [t.recap.siret, charter.siret],
    [t.recap.signedAt, t.signedOn(date, time)],
    [
      t.recap.rules,
      t.recap.rulesValue(
        CHARTER_TOTAL,
        CHARTER_RULES[0]?.code ?? "",
        CHARTER_RULES.at(-1)?.code ?? "",
      ),
    ],
    [t.recap.engagement, t.recap.engagementValue(ENGAGEMENT_VERSION)],
    [t.recap.level, T.startLevel],
  ];
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 py-6 text-center">
      <HexBadge />
      <span className="text-xs font-bold tracking-[0.06em] text-primary-strong uppercase">
        {T.doneEyebrow}
      </span>
      <h2 className="text-3xl leading-tight font-bold tracking-tight text-balance">
        {T.doneTitle(charter.signer_name.split(" ")[0] ?? null)}
      </h2>
      <p className="text-muted-foreground">{T.doneLead}</p>
      <dl className="flex w-full flex-col gap-2 rounded-card border border-border bg-surface p-4 text-left text-sm">
        {recap.map(([label, value], i) => (
          <div
            key={label}
            className={`flex justify-between gap-2.5 ${i ? "border-t border-border pt-2" : ""}`}
          >
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-right font-bold">{value}</dd>
          </div>
        ))}
      </dl>
      <Link
        href={continueHref as Route}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-pill bg-primary px-6 font-bold text-white hover:bg-primary-hover"
      >
        {continueLabel}
        <ArrowRight aria-hidden="true" className="size-5" strokeWidth={2.4} />
      </Link>
      <Link
        href={rereadHref as Route}
        className="text-sm font-bold text-primary-strong hover:underline"
      >
        {t.reread}
      </Link>
    </div>
  );
}
