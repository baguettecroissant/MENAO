/**
 * Activité de l'artisan pour son tableau de bord (F-16, ADR 0185) : chiffre d'affaires de l'année
 * mois par mois, argent à venir et à recevoir, devis en attente de réponse, taux de signature,
 * chantiers en cours et soldes à recevoir. Mêmes règles sur le site et dans l'application ; montants
 * en centimes. Lecture seule : rien n'est calculé en dehors de ce que l'artisan voit déjà.
 */

import { chantierStepIndex } from "./chantier-progress";
import type { ChantierStatus } from "./chantier-state";

const parisMonth = new Intl.DateTimeFormat("fr-CA", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
});

/** Chantiers en cours : du devis signé jusqu'aux réserves levées (avant la réception). */
export const CHANTIERS_IN_PROGRESS: readonly ChantierStatus[] = [
  "devis_signe",
  "acompte_paye",
  "planifie",
  "en_cours",
  "travaux_termines",
  "reserves_a_lever",
];

/** Période du taux de signature et du montant moyen d'un devis signé (jours). */
export const SIGN_RATE_DAYS = 180;

export type ActivityPayment = {
  chantierId: string;
  quoteId: string;
  kind: "acompte" | "solde";
  status: string;
  amountCents: number;
  paidAt: string | null;
};

export type ActivityQuote = {
  quoteId: string;
  chantierId: string;
  status: string;
  totalTtcCents: number;
  sentAt: string | null;
  title: string;
  clientName: string | null;
};

export type ActivityChantier = {
  chantierId: string;
  status: ChantierStatus;
  title: string;
  clientName: string | null;
  startAt: string | null;
};

export type DashboardActivity = {
  year: number;
  /** Encaissé chaque mois de l'année (12 valeurs, janvier en premier). */
  months: number[];
  /** Encaissé sur l'année. */
  yearCents: number;
  /** Reste à payer sur les devis signés des chantiers en cours (acompte compris). */
  upcomingCents: number;
  /** Soldes dus sur les chantiers réceptionnés. */
  toCollectCents: number;
  quotes: {
    pending: {
      quoteId: string;
      chantierId: string;
      title: string;
      clientName: string | null;
      totalTtcCents: number;
      sentAt: string | null;
    }[];
    pendingTotalCents: number;
    /** Devis signés ÷ devis envoyés sur 6 mois (pour cent), null sans devis envoyé. */
    signRate: number | null;
    /** Montant moyen d'un devis signé sur 6 mois, null sans devis signé. */
    averageSignedCents: number | null;
  };
  inProgress: {
    chantierId: string;
    title: string;
    clientName: string | null;
    status: ChantierStatus;
    /** Étape du chantier (0 à 4, comme la frise du suivi), null hors frise. */
    step: number | null;
    startAt: string | null;
    totalCents: number;
    paidCents: number;
  }[];
  receivables: {
    chantierId: string;
    title: string;
    clientName: string | null;
    amountCents: number;
  }[];
};

/** Mois de Paris (« AAAA-MM ») d'un instant. */
function monthOf(iso: string): string {
  return parisMonth.format(new Date(iso)).slice(0, 7);
}

/**
 * Activité de l'artisan pour `year` (année de Paris), à partir de ses paiements, de ses devis
 * (artisan_quotes, toutes versions) et de ses chantiers (artisan_chantiers).
 */
export function dashboardActivity(
  input: {
    payments: readonly ActivityPayment[];
    quotes: readonly ActivityQuote[];
    chantiers: readonly ActivityChantier[];
  },
  year: number,
  now: Date = new Date(),
): DashboardActivity {
  const paid = input.payments.filter((p) => p.status === "paye" && p.paidAt);
  const months = Array.from({ length: 12 }, () => 0);
  for (const p of paid) {
    const [y, m] = monthOf(p.paidAt ?? "")
      .split("-")
      .map(Number) as [number, number];
    if (y === year) months[m - 1] = (months[m - 1] ?? 0) + p.amountCents;
  }

  // Devis signé de chaque chantier et ce qui en est déjà payé.
  const signed = new Map(
    input.quotes.filter((q) => q.status === "signe").map((q) => [q.chantierId, q] as const),
  );
  const paidOn = (quoteId: string) =>
    paid.filter((p) => p.quoteId === quoteId).reduce((sum, p) => sum + p.amountCents, 0);
  const remaining = (chantierId: string) => {
    const quote = signed.get(chantierId);
    return quote ? Math.max(0, quote.totalTtcCents - paidOn(quote.quoteId)) : 0;
  };

  const inProgress = input.chantiers
    .filter((c) => CHANTIERS_IN_PROGRESS.includes(c.status) && signed.has(c.chantierId))
    .map((c) => {
      const quote = signed.get(c.chantierId);
      return {
        chantierId: c.chantierId,
        title: c.title,
        clientName: c.clientName,
        status: c.status,
        step: chantierStepIndex(c.status),
        startAt: c.startAt,
        totalCents: quote?.totalTtcCents ?? 0,
        paidCents: quote ? paidOn(quote.quoteId) : 0,
      };
    });
  const receivables = input.chantiers
    .filter((c) => c.status === "receptionne")
    .map((c) => ({
      chantierId: c.chantierId,
      title: c.title,
      clientName: c.clientName,
      amountCents: remaining(c.chantierId),
    }))
    .filter((r) => r.amountCents > 0);

  // Devis envoyés : dernière version de chaque chantier (les versions remplacées ne comptent pas).
  const sent = input.quotes.filter((q) => q.status !== "brouillon" && q.status !== "remplace");
  const pending = sent
    .filter((q) => q.status === "envoye")
    .sort((a, b) => (b.sentAt ?? "").localeCompare(a.sentAt ?? ""))
    .map((q) => ({
      quoteId: q.quoteId,
      chantierId: q.chantierId,
      title: q.title,
      clientName: q.clientName,
      totalTtcCents: q.totalTtcCents,
      sentAt: q.sentAt,
    }));
  const since = now.getTime() - SIGN_RATE_DAYS * 86_400_000;
  const recent = sent.filter((q) => q.sentAt && Date.parse(q.sentAt) >= since);
  const recentSigned = recent.filter((q) => q.status === "signe");

  return {
    year,
    months,
    yearCents: months.reduce((sum, cents) => sum + cents, 0),
    upcomingCents: inProgress.reduce((sum, c) => sum + Math.max(0, c.totalCents - c.paidCents), 0),
    toCollectCents: receivables.reduce((sum, r) => sum + r.amountCents, 0),
    quotes: {
      pending,
      pendingTotalCents: pending.reduce((sum, q) => sum + q.totalTtcCents, 0),
      signRate: recent.length ? Math.round((100 * recentSigned.length) / recent.length) : null,
      averageSignedCents: recentSigned.length
        ? Math.round(
            recentSigned.reduce((sum, q) => sum + q.totalTtcCents, 0) / recentSigned.length,
          )
        : null,
    },
    inProgress,
    receivables,
  };
}

/** Années proposées : celles des paiements reçus, et l'année en cours, de la plus récente. */
export function activityYears(
  payments: readonly ActivityPayment[],
  now: Date = new Date(),
): number[] {
  const current = Number(monthOf(now.toISOString()).slice(0, 4));
  const years = new Set([current]);
  for (const p of payments) {
    if (p.status === "paye" && p.paidAt) years.add(Number(monthOf(p.paidAt).slice(0, 4)));
  }
  return [...years].sort((a, b) => b - a);
}

/** Graduations de l'axe du graphique : 0 et des paliers ronds jusqu'au mois le plus haut. */
export function revenueTicks(months: readonly number[]): number[] {
  const max = Math.max(0, ...months);
  if (max === 0) return [0];
  const steps = [
    10_000, 20_000, 50_000, 100_000, 200_000, 500_000, 1_000_000, 2_000_000, 5_000_000,
  ];
  const step = steps.find((s) => max / s <= 4) ?? 10_000_000;
  const top = Math.ceil(max / step) * step;
  return Array.from({ length: top / step + 1 }, (_, i) => i * step);
}

/** Lignes de la base (payments, artisan_quotes, artisan_chantiers) mises à la forme du calcul. */
export function activityInputFromRows(rows: {
  payments: readonly {
    chantier_id: string;
    quote_id: string;
    kind: "acompte" | "solde";
    status: string;
    amount_cents: number;
    paid_at: string | null;
  }[];
  quotes: readonly {
    quote_id: string;
    chantier_id: string;
    status: string;
    total_ttc_cents: number;
    sent_at: string | null;
    title: string;
    client_name: string | null;
  }[];
  chantiers: readonly {
    chantier_id: string;
    status: ChantierStatus;
    title: string;
    client_first_name: string | null;
    client_last_name: string | null;
    start_at: string | null;
  }[];
}) {
  return {
    payments: rows.payments.map((p): ActivityPayment => ({
      chantierId: p.chantier_id,
      quoteId: p.quote_id,
      kind: p.kind,
      status: p.status,
      amountCents: p.amount_cents,
      paidAt: p.paid_at,
    })),
    quotes: rows.quotes.map((q): ActivityQuote => ({
      quoteId: q.quote_id,
      chantierId: q.chantier_id,
      status: q.status,
      totalTtcCents: q.total_ttc_cents,
      sentAt: q.sent_at,
      title: q.title,
      clientName: q.client_name,
    })),
    chantiers: rows.chantiers.map((c): ActivityChantier => ({
      chantierId: c.chantier_id,
      status: c.status,
      title: c.title,
      clientName: [c.client_first_name, c.client_last_name].filter(Boolean).join(" ") || null,
      startAt: c.start_at,
    })),
  };
}

/** Année affichée : celle demandée si elle est proposée, sinon l'année en cours. */
export function activityYear(
  requested: string | null | undefined,
  years: readonly number[],
): number {
  const year = Number(requested);
  return years.includes(year) ? year : (years[0] ?? new Date().getFullYear());
}

/** Mois en cours (0 à 11) si `year` est l'année en cours à Paris, sinon null. */
export function activityCurrentMonth(year: number, now: Date = new Date()): number | null {
  const [y, m] = monthOf(now.toISOString()).split("-").map(Number) as [number, number];
  return y === year ? m - 1 : null;
}
