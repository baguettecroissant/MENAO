import { CHANTIER_STAGES, chantiersByStage, requestRates, searchConversion } from "@menao/core";
import {
  Ban,
  BadgeCheck,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  HardHat,
  Hourglass,
  Inbox,
  type LucideIcon,
  Scale,
  Search,
  Send,
  ShieldCheck,
  Star,
  UserPlus,
  Wallet,
  XCircle,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { fr } from "@/i18n/fr";
import type { ActivityItem, Overview } from "@/lib/admin/overview";
import { formatDayTime, formatTimeAgo } from "@/lib/format";

const t = fr.admin.overview;
const euros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const percentOrDash = (value: number | null) => (value === null ? "—" : fr.review.percent(value));

// ---------------------------------------------------------------------------
// À traiter maintenant
// ---------------------------------------------------------------------------

type Tone = "danger" | "warning" | "primary";
const TONES: Record<Tone, string> = {
  danger: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
  primary: "bg-primary-softer text-primary-strong",
};

/** Carte du bloc « À traiter maintenant » : ce qui attend, pourquoi, et où le traiter. */
export function TodoCard({
  icon: Icon,
  tone,
  title,
  hint,
  action,
  children,
}: {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  hint: string;
  action?: { href: string; label: string };
  children?: ReactNode;
}) {
  return (
    <article
      aria-label={title}
      className="flex h-full flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl ${TONES[tone]}`}
        >
          <Icon className="size-5" />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="font-medium">{title}</h3>
          <p className="text-sm text-muted-foreground">{hint}</p>
        </div>
      </div>
      {children}
      {action && (
        <Link
          href={action.href as Route}
          className="mt-auto self-start text-sm font-medium text-primary underline-offset-2 hover:underline"
        >
          {action.label} →
        </Link>
      )}
    </article>
  );
}

// ---------------------------------------------------------------------------
// Activité en direct
// ---------------------------------------------------------------------------

const text = (details: Record<string, unknown>, key: string) => {
  const value = details[key];
  return typeof value === "string" && value.trim() ? value : null;
};

type Described = { icon: LucideIcon; label: string; detail: string | null; href: string | null };

const CHANTIER_ICONS: Record<string, LucideIcon> = {
  rdv_fixe: CalendarCheck,
  devis_envoye: FileText,
  revision_demandee: FileText,
  devis_refuse: FileText,
  devis_signe: FileText,
  acompte_paye: Wallet,
  date_confirmee: HardHat,
  demarrage: HardHat,
  fin_declaree: HardHat,
  pv_sans_reserves: ClipboardCheck,
  pv_avec_reserves: ClipboardCheck,
  reserves_levees: ClipboardCheck,
  solde_paye: Wallet,
  litige_ouvert: Scale,
  litige_resolu: Scale,
  litige_annule: Scale,
  annulation: Ban,
};

/** Phrase, icône et lien d'un événement du fil (sans identité des particuliers). */
export function describeActivity(item: ActivityItem): Described | null {
  const d = item.details;
  const artisan = text(d, "artisan") ?? text(d, "entreprise") ?? t.activity.unknownArtisan;
  const artisanId = text(d, "artisan_id");
  const artisanHref = artisanId ? `/admin/artisans/${artisanId}` : null;
  // Fiches de la demande et du chantier (ADR 0046).
  const projectId = text(d, "project_id");
  const requestHref = projectId ? `/admin/demandes/${projectId}` : null;
  const chantierId = text(d, "chantier_id");
  const place = [text(d, "metier"), text(d, "ville")].filter(Boolean).join(" · ") || null;
  switch (item.kind) {
    case "recherche":
      return { icon: Search, label: t.activity.recherche, detail: place, href: requestHref };
    case "demande_envoyee":
      return {
        icon: Send,
        label: t.activity.demande_envoyee(artisan),
        detail: place,
        href: requestHref,
      };
    case "demande_acceptee":
      return {
        icon: CheckCircle2,
        label: t.activity.demande_acceptee(artisan),
        detail: text(d, "ville"),
        href: requestHref,
      };
    case "demande_refusee":
      return {
        icon: XCircle,
        label: t.activity.demande_refusee(artisan),
        detail: text(d, "ville"),
        href: requestHref,
      };
    case "demande_expiree":
      return {
        icon: Hourglass,
        label: t.activity.demande_expiree(artisan),
        detail: text(d, "ville"),
        href: requestHref ?? artisanHref,
      };
    case "demande_annulee":
      return {
        icon: Ban,
        label: t.activity.demande_annulee(artisan),
        detail: text(d, "ville"),
        href: requestHref,
      };
    case "chantier": {
      const event = text(d, "evenement") ?? "";
      const label = t.activity.chantier[event as keyof typeof t.activity.chantier];
      if (!label) return null;
      return {
        icon: CHANTIER_ICONS[event] ?? HardHat,
        label: `${label} · ${artisan}`,
        detail: [text(d, "titre"), text(d, "ville")].filter(Boolean).join(" · ") || null,
        href: event.startsWith("litige_")
          ? "/admin/tickets"
          : chantierId
            ? `/admin/chantiers/${chantierId}`
            : null,
      };
    }
    case "dossier_envoye":
      return {
        icon: UserPlus,
        label: t.activity.dossier_envoye(artisan),
        detail: null,
        href: artisanHref,
      };
    case "dossier_decision": {
      const decision = text(d, "decision") as keyof typeof t.activity.dossier_decision | null;
      const label = decision ? t.activity.dossier_decision[decision] : undefined;
      if (!label) return null;
      return { icon: ShieldCheck, label: label(artisan), detail: null, href: artisanHref };
    }
    case "ticket": {
      const type = text(d, "type") as keyof typeof fr.admin.tickets.types | null;
      const label = type ? fr.admin.tickets.types[type] : undefined;
      return {
        icon: Inbox,
        label: t.activity.ticket(label ?? ""),
        detail: null,
        href: "/admin/tickets",
      };
    }
    case "avis": {
      const score = typeof d.note === "number" ? fr.review.percent(d.note) : "—";
      return {
        icon: Star,
        label: t.activity.avis(artisan, score),
        detail: null,
        href: artisanHref,
      };
    }
    case "abonnement":
      return {
        icon: BadgeCheck,
        label: t.activity.abonnement(artisan),
        detail: text(d, "formule"),
        href: artisanHref,
      };
    default:
      return null;
  }
}

export function ActivityFeed({ items, now }: { items: ActivityItem[]; now: Date }) {
  const rows = items
    .map((item) => ({ item, described: describeActivity(item) }))
    .filter((r): r is { item: ActivityItem; described: Described } => r.described !== null);
  if (!rows.length) return <p className="text-sm text-muted-foreground">{t.activity.empty}</p>;
  return (
    <ol className="flex flex-col">
      {rows.map(({ item, described: { icon: Icon, label, detail, href } }, index) => (
        <li
          key={`${item.kind}-${item.occurredAt}-${index}`}
          className="flex items-start gap-3 border-t border-border py-3 first:border-t-0 first:pt-0"
        >
          <span
            aria-hidden="true"
            className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-softer text-primary-strong"
          >
            <Icon className="size-4" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            {href ? (
              <Link
                href={href as Route}
                className="text-sm font-medium underline-offset-2 hover:text-primary-strong hover:underline"
              >
                {label}
              </Link>
            ) : (
              <p className="text-sm font-medium">{label}</p>
            )}
            {detail && <p className="truncate text-xs text-muted-foreground">{detail}</p>}
          </div>
          <time
            dateTime={item.occurredAt}
            title={formatDayTime(item.occurredAt)}
            className="shrink-0 text-xs text-muted-foreground"
          >
            {formatTimeAgo(item.occurredAt, now)}
          </time>
        </li>
      ))}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Chiffres clés
// ---------------------------------------------------------------------------

type Figure = { label: string; value: string; href?: string; emphasis?: boolean };

function FiguresCard({ title, rows, note }: { title: string; rows: Figure[]; note?: string }) {
  return (
    <section
      aria-label={title}
      className="rounded-card border border-border bg-surface p-5 shadow-card"
    >
      <h3 className="font-medium">{title}</h3>
      <dl className="mt-3 flex flex-col">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between gap-4 border-t border-border py-2 text-sm first:border-t-0"
          >
            <dt className="text-muted-foreground">
              {row.href ? (
                <Link
                  href={row.href as Route}
                  className="underline-offset-2 hover:text-primary-strong hover:underline"
                >
                  {row.label}
                </Link>
              ) : (
                row.label
              )}
            </dt>
            <dd
              className={`shrink-0 tabular-nums ${row.emphasis ? "font-semibold text-foreground" : "font-medium"}`}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
      {note && <p className="mt-3 text-xs text-muted-foreground">{note}</p>}
    </section>
  );
}

export function KeyFigures({ overview: o }: { overview: Overview }) {
  const f = t.figures;
  const rates = requestRates({
    accepted: o.demandes.acceptees_30j,
    refused: o.demandes.refusees_30j,
    expired: o.demandes.expirees_30j,
  });
  const stages = chantiersByStage(o.chantiers);
  const count = (n: number) => n.toLocaleString("fr-FR");
  return (
    <div className="flex flex-col gap-4">
      <FiguresCard
        title={f.requests.title}
        rows={[
          { label: f.requests.today, value: count(o.demandes.aujourdhui), emphasis: true },
          { label: f.requests.week, value: count(o.demandes.j7) },
          { label: f.requests.month, value: count(o.demandes.j30) },
          {
            label: f.requests.pending,
            value: count(o.demandes.en_attente),
            href: "/admin/demandes?filtre=en_attente",
          },
          { label: f.requests.responseRate, value: percentOrDash(rates.response) },
          { label: f.requests.acceptanceRate, value: percentOrDash(rates.acceptance) },
          { label: f.requests.searches, value: count(o.recherches.j30) },
          {
            label: f.requests.conversion,
            value: percentOrDash(
              searchConversion({ searches: o.recherches.j30, sent: o.recherches.envoyees_30j }),
            ),
          },
          {
            label: f.requests.drafts,
            value: count(o.recherches.non_envoyees_7j),
            href: "/admin/demandes?filtre=non_envoyee",
          },
        ]}
      />
      <FiguresCard
        title={f.chantiers.title}
        rows={[
          ...CHANTIER_STAGES.filter((s) => s !== "termine" && s !== "abandonne").map((stage) => ({
            label: f.chantiers.stages[stage],
            href: `/admin/chantiers?etape=${stage}`,
            value: count(stages[stage]),
            emphasis: stage === "litige" && stages.litige > 0,
          })),
          { label: f.chantiers.quotesSent, value: count(o.devis.envoyes_30j) },
          { label: f.chantiers.quotesSigned, value: count(o.devis.signes_30j) },
          { label: f.chantiers.signedAmount, value: euros.format(o.devis.signes_30j_cents / 100) },
        ]}
      />
      <FiguresCard
        title={f.artisans.title}
        rows={[
          {
            label: f.artisans.visible,
            value: count(o.artisans.visibles),
            href: "/admin/artisans?statut=valide",
            emphasis: true,
          },
          {
            label: f.artisans.pending,
            value: count(o.artisans.en_verification),
            href: "/admin/artisans?statut=en_verification",
          },
          {
            label: f.artisans.suspended,
            value: count(o.artisans.suspendus),
            href: "/admin/artisans?statut=suspendu",
          },
          { label: f.artisans.signups, value: count(o.artisans.inscrits_30j) },
          { label: f.artisans.active, value: count(o.abonnements.actifs) },
          { label: f.artisans.trials, value: count(o.abonnements.essais) },
          { label: f.artisans.unpaid, value: count(o.abonnements.impayes) },
          { label: f.artisans.cancelled, value: count(o.abonnements.resilies_30j) },
        ]}
      />
      <FiguresCard
        title={f.payments.title}
        rows={[
          {
            label: f.payments.paid,
            value: euros.format(o.paiements.payes_30j_cents / 100),
            emphasis: true,
          },
          { label: f.payments.count, value: count(o.paiements.payes_30j) },
          { label: f.payments.failed, value: count(o.paiements.echoues_7j) },
        ]}
        note={f.payments.note}
      />
      <FiguresCard
        title={f.support.title}
        rows={[
          { label: f.support.reviews, value: count(o.avis.publies_30j) },
          {
            label: f.support.average,
            value: o.avis.note_moyenne === null ? "—" : fr.review.percent(o.avis.note_moyenne),
          },
          { label: f.support.open, value: count(o.tickets.ouverts), href: "/admin/tickets" },
          { label: f.support.late, value: count(o.tickets.en_retard), href: "/admin/tickets" },
        ]}
      />
    </div>
  );
}
