import { type PlanUsage, nextPlan, requestLimitLevel } from "@menao/core";
import type { Route } from "next";
import Link from "next/link";
import { fr } from "@/i18n/fr";

const t = fr.pro.planLimits;

/**
 * Demandes du mois face à la limite de la formule (F-139, ADR 0290) : prévenir sans bloquer, à
 * 80 % de la limite, puis à la limite et au-delà. Site seulement (jamais dans l'application
 * native, CLAUDE.md règle 10) ; pour le patron, qui gère l'abonnement.
 */
export function PlanLimitBanner({ usage }: { usage: PlanUsage }) {
  const level = requestLimitLevel(usage.requests);
  const next = nextPlan(usage.plan);
  const limit = usage.requests.limit;
  if (level === "ok" || !next || limit === null) return null;
  const plan = t.plans[usage.plan ?? "base"] ?? "";
  const nextName = t.plans[next] ?? "";
  const text =
    level === "proche"
      ? t.proche(usage.requests.received, limit, plan, nextName)
      : level === "atteinte"
        ? t.atteinte(limit, plan, nextName)
        : t.depassee(usage.requests.received, limit, plan, nextName);
  return (
    <div
      role="status"
      className={`flex flex-col gap-2 rounded-card border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between ${
        level === "proche"
          ? "border-primary/25 bg-primary-softer text-primary-strong"
          : "border-warning/30 bg-warning-soft text-warning"
      }`}
    >
      <p>{text}</p>
      <Link
        href={"/pro/onboarding/formule" as Route}
        className="shrink-0 font-semibold underline underline-offset-2"
      >
        {t.cta}
      </Link>
    </div>
  );
}
