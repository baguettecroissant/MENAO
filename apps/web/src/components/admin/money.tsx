import { TriangleAlert } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { fr } from "@/i18n/fr";

/** Chiffre clé d'une page du back-office : libellé, valeur et explication courte. */
export function SummaryTile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: ReactNode;
  tone?: "default" | "warning" | "danger";
}) {
  const valueTone = { default: "", warning: "text-warning", danger: "text-danger" }[tone];
  return (
    <div className="flex flex-col gap-1.5 bg-surface px-5 py-4 sm:px-6 sm:py-5">
      <dt className="text-sm font-semibold text-label">{label}</dt>
      <dd
        className={`font-display text-[1.75rem] leading-none font-bold tracking-tight tabular-nums sm:text-[2rem] ${valueTone}`}
      >
        {value}
      </dd>
      {hint && <dd className="text-[0.8125rem] text-muted-foreground">{hint}</dd>}
    </div>
  );
}

/** Grille de chiffres clés (liste de définitions, lue d'un seul tenant par un lecteur d'écran). */
export function SummaryTiles({
  label,
  children,
  columns = 4,
}: {
  label: string;
  children: ReactNode;
  /** Trois chiffres : une ligne de trois, sans case vide (ADR 0283). */
  columns?: 3 | 4;
}) {
  return (
    // Refonte « Nette » (ADR 0259) : les chiffres dans un seul cadre, séparés par un filet.
    <dl
      aria-label={label}
      className={`grid gap-px overflow-hidden rounded-card border border-border bg-border shadow-card ${columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-4"}`}
    >
      {children}
    </dl>
  );
}

/**
 * Notifications Stripe ou DocuSeal en échec (ADR 0051) : les paiements et abonnements affichés
 * peuvent être en retard sur la réalité.
 */
export function WebhookAlert({ failures }: { failures: number }) {
  if (failures <= 0) return null;
  const t = fr.admin.payments;
  return (
    <p
      role="status"
      className="flex flex-col gap-1 rounded-input bg-warning-soft px-4 py-3 text-sm text-warning sm:flex-row sm:items-center sm:gap-2.5"
    >
      <span className="flex items-start gap-2.5">
        <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>{t.webhooksAlert(failures)}</span>
      </span>
      <Link
        href={"/admin/technique/notifications" as Route}
        className="shrink-0 font-medium underline underline-offset-2 sm:ml-auto"
      >
        {t.webhooksLink} →
      </Link>
    </p>
  );
}
