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
    <div className="flex flex-col gap-1 rounded-card border border-border bg-surface p-5 shadow-card">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={`text-2xl font-medium tracking-tight tabular-nums ${valueTone}`}>{value}</dd>
      {hint && <dd className="text-xs text-muted-foreground">{hint}</dd>}
    </div>
  );
}

/** Grille de chiffres clés (liste de définitions, lue d'un seul tenant par un lecteur d'écran). */
export function SummaryTiles({ label, children }: { label: string; children: ReactNode }) {
  return (
    <dl aria-label={label} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
        href={"/admin/paiements/notifications" as Route}
        className="shrink-0 font-medium underline underline-offset-2 sm:ml-auto"
      >
        {t.webhooksLink} →
      </Link>
    </p>
  );
}
