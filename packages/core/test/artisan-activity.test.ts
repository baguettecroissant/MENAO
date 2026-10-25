import { describe, expect, it } from "vitest";
import {
  activityCurrentMonth,
  activityInputFromRows,
  activityYear,
  activityYears,
  dashboardActivity,
  revenueTicks,
  type ActivityChantier,
  type ActivityPayment,
  type ActivityQuote,
} from "../src/artisan-activity";
import { exampleActivityInput } from "../src/space-examples";

const NOW = new Date("2026-10-25T10:00:00Z");

const quote = (
  n: number,
  status: string,
  totalTtcCents: number,
  sentAt: string | null,
): ActivityQuote => ({
  quoteId: `q${n}`,
  chantierId: `c${n}`,
  status,
  totalTtcCents,
  sentAt,
  title: `Chantier ${n}`,
  clientName: `Client ${n}`,
});
const chantier = (n: number, status: ActivityChantier["status"]): ActivityChantier => ({
  chantierId: `c${n}`,
  status,
  title: `Chantier ${n}`,
  clientName: `Client ${n}`,
  startAt: null,
});
const payment = (
  n: number,
  kind: "acompte" | "solde",
  amountCents: number,
  paidAt: string | null,
  status = "paye",
): ActivityPayment => ({
  chantierId: `c${n}`,
  quoteId: `q${n}`,
  kind,
  status,
  amountCents,
  paidAt,
});

describe("activité de l'artisan (ADR 0185)", () => {
  const input = {
    quotes: [
      quote(1, "signe", 100_000, "2026-09-01T08:00:00Z"),
      quote(2, "signe", 50_000, "2026-08-01T08:00:00Z"),
      quote(3, "envoye", 80_000, "2026-10-20T08:00:00Z"),
      quote(4, "envoye", 20_000, "2026-10-22T08:00:00Z"),
      quote(5, "refuse", 30_000, "2026-07-01T08:00:00Z"),
      quote(6, "remplace", 99_000, "2026-10-01T08:00:00Z"),
      quote(7, "brouillon", 10_000, null),
      quote(8, "signe", 40_000, "2025-12-01T08:00:00Z"),
    ],
    chantiers: [
      chantier(1, "en_cours"),
      chantier(2, "receptionne"),
      chantier(3, "devis_envoye"),
      chantier(8, "cloture"),
    ],
    payments: [
      payment(1, "acompte", 30_000, "2026-09-03T08:00:00Z"),
      payment(2, "acompte", 15_000, "2026-08-02T08:00:00Z"),
      // 31 janvier à 23 h 30 UTC : 1er février à Paris.
      payment(8, "acompte", 12_000, "2026-01-31T23:30:00Z"),
      payment(8, "solde", 28_000, "2025-12-20T08:00:00Z"),
      // Virement en cours de confirmation : pas encore encaissé.
      payment(2, "solde", 35_000, null, "en_cours"),
    ],
  };
  const activity = dashboardActivity(input, 2026, NOW);

  it("encaissé par mois de Paris, sur l'année choisie seulement", () => {
    expect(activity.months[1]).toBe(12_000);
    expect(activity.months[7]).toBe(15_000);
    expect(activity.months[8]).toBe(30_000);
    expect(activity.yearCents).toBe(57_000);
    expect(dashboardActivity(input, 2025, NOW).yearCents).toBe(28_000);
  });

  it("à venir sur les chantiers en cours, solde à recevoir sur les chantiers réceptionnés", () => {
    expect(activity.upcomingCents).toBe(70_000);
    expect(activity.inProgress).toEqual([
      expect.objectContaining({
        chantierId: "c1",
        step: 3,
        totalCents: 100_000,
        paidCents: 30_000,
      }),
    ]);
    expect(activity.toCollectCents).toBe(35_000);
    expect(activity.receivables).toEqual([
      { chantierId: "c2", title: "Chantier 2", clientName: "Client 2", amountCents: 35_000 },
    ]);
  });

  it("devis en attente, du plus récent ; taux de signature et montant moyen sur 6 mois", () => {
    expect(activity.quotes.pending.map((q) => q.quoteId)).toEqual(["q4", "q3"]);
    expect(activity.quotes.pendingTotalCents).toBe(100_000);
    // Sur 6 mois : 2 signés, 1 refusé, 2 envoyés (remplacé, brouillon et devis de 2025 exclus).
    expect(activity.quotes.signRate).toBe(40);
    expect(activity.quotes.averageSignedCents).toBe(75_000);
  });

  it("sans rien : zéros et pas de taux", () => {
    const empty = dashboardActivity({ payments: [], quotes: [], chantiers: [] }, 2026, NOW);
    expect(empty.yearCents).toBe(0);
    expect(empty.quotes.signRate).toBeNull();
    expect(empty.quotes.averageSignedCents).toBeNull();
    expect(empty.inProgress).toEqual([]);
  });

  it("années proposées et graduations rondes", () => {
    expect(activityYears(input.payments, NOW)).toEqual([2026, 2025]);
    expect(activityYears([], NOW)).toEqual([2026]);
    expect(revenueTicks([0, 0])).toEqual([0]);
    expect(revenueTicks([30_000, 15_000])).toEqual([0, 10_000, 20_000, 30_000]);
    expect(revenueTicks([1_234_500])).toEqual([0, 500_000, 1_000_000, 1_500_000]);
  });
});

describe("activité d'exemple (ADR 0184, 0185)", () => {
  it("graphique rempli mois par mois, à venir, solde à recevoir, devis en attente", () => {
    const activity = dashboardActivity(exampleActivityInput(NOW), 2026, NOW);
    expect(activity.months.slice(0, 9).every((cents) => cents > 0)).toBe(true);
    expect(activity.months[9]).toBeGreaterThan(0);
    expect(activity.months.slice(10)).toEqual([0, 0]);
    expect(activity.upcomingCents).toBe(792_000 - 237_600);
    expect(activity.toCollectCents).toBe(84_000 - 25_200);
    expect(activity.quotes.pending.map((q) => q.title)).toEqual(["Plomberie d'une cuisine"]);
    expect(activity.quotes.signRate).toBe(70);
    expect(activity.inProgress.map((c) => c.title)).toEqual(["Création d'une salle d'eau"]);
  });
});

describe("année et mois affichés", () => {
  it("année demandée si proposée, sinon la plus récente ; mois en cours pour l'année en cours", () => {
    expect(activityYear("2025", [2026, 2025])).toBe(2025);
    expect(activityYear("1999", [2026, 2025])).toBe(2026);
    expect(activityYear(undefined, [2026])).toBe(2026);
    expect(activityCurrentMonth(2026, NOW)).toBe(9);
    expect(activityCurrentMonth(2025, NOW)).toBeNull();
    // 31 décembre à 23 h 30 UTC : déjà janvier à Paris.
    expect(activityCurrentMonth(2027, new Date("2026-12-31T23:30:00Z"))).toBe(0);
  });

  it("lignes de la base mises à la forme du calcul", () => {
    const input = activityInputFromRows({
      payments: [
        {
          chantier_id: "c",
          quote_id: "q",
          kind: "acompte",
          status: "paye",
          amount_cents: 1,
          paid_at: null,
        },
      ],
      quotes: [
        {
          quote_id: "q",
          chantier_id: "c",
          status: "signe",
          total_ttc_cents: 2,
          sent_at: null,
          title: "T",
          client_name: "C",
        },
      ],
      chantiers: [
        {
          chantier_id: "c",
          status: "en_cours",
          title: "T",
          client_first_name: "Ana",
          client_last_name: null,
          start_at: null,
        },
      ],
    });
    expect(input.chantiers[0]?.clientName).toBe("Ana");
    expect(input.quotes[0]?.totalTtcCents).toBe(2);
    expect(input.payments[0]?.amountCents).toBe(1);
  });
});
