/**
 * Augmenter ses prix en un geste (F-149, ADR 0312, maquette lot 43) : une hausse en pourcentage
 * sur les ouvrages à prix fixé à la main et/ou sur les prix d'achat des fournitures, avec un
 * arrondi au choix. Même calcul que la base (`artisan_raise_prices`) : arrondi au plus proche,
 * jamais en dessous du prix de départ.
 */

export const RAISE_ROUNDINGS = ["centime", "dix", "euro"] as const;
export type RaiseRounding = (typeof RAISE_ROUNDINGS)[number];

/** Pas d'arrondi en centimes. */
export const RAISE_STEP: Record<RaiseRounding, number> = { centime: 1, dix: 10, euro: 100 };

/** Hausse permise : de 0,1 % à 30 %. */
export const RAISE_MIN_BP = 10;
export const RAISE_MAX_BP = 3000;

/** Hausse saisie (« 3 », « + 3 % », « 2,5 ») en points de base ; hors bornes : null. */
export function parseRaise(input: string): number | null {
  const m = /^\+?(\d{1,2})(?:[.,](\d{1,2}))?$/.exec(input.replace(/[%\s]/g, ""));
  if (!m) return null;
  const bp = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
  return bp >= RAISE_MIN_BP && bp <= RAISE_MAX_BP ? bp : null;
}

/** Hausse affichée : « + 3 % », « + 2,5 % ». */
export function formatRaise(bp: number): string {
  return `+ ${(bp / 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %`;
}

/** Prix augmenté, arrondi au plus proche (moitié vers le haut), jamais sous le prix de départ. */
export function raisePrice(cents: number, bp: number, rounding: RaiseRounding): number {
  const step = RAISE_STEP[rounding];
  const scaled = cents * (10000 + bp);
  const d = 10000 * step;
  const rounded = Math.floor((2 * scaled + d) / (2 * d)) * step;
  return Math.max(rounded, cents);
}

export type RaiseItem = {
  kind: "ouvrage" | "fourniture";
  id: string;
  designation: string;
  unit: string;
  beforeCents: number;
  afterCents: number;
};

/**
 * Ce que la hausse change : ouvrages à prix fixé à la main, puis fournitures avec un prix d'achat
 * (dans l'ordre reçu) ; un article dont le prix ne bouge pas (arrondi) n'est pas compté.
 */
export function raisePlan(
  works: readonly {
    id: string;
    designation: string;
    unit: string;
    manualPriceCents: number | null;
  }[],
  supplies: readonly {
    id: string;
    designation: string;
    unit: string;
    purchasePriceCents: number | null;
  }[],
  bp: number,
  rounding: RaiseRounding,
  scope: { works: boolean; supplies: boolean },
): RaiseItem[] {
  const items: RaiseItem[] = [];
  if (scope.works) {
    for (const w of works) {
      if (w.manualPriceCents === null) continue;
      items.push({
        kind: "ouvrage",
        id: w.id,
        designation: w.designation,
        unit: w.unit,
        beforeCents: w.manualPriceCents,
        afterCents: raisePrice(w.manualPriceCents, bp, rounding),
      });
    }
  }
  if (scope.supplies) {
    for (const s of supplies) {
      if (s.purchasePriceCents === null) continue;
      items.push({
        kind: "fourniture",
        id: s.id,
        designation: s.designation,
        unit: s.unit,
        beforeCents: s.purchasePriceCents,
        afterCents: raisePrice(s.purchasePriceCents, bp, rounding),
      });
    }
  }
  return items.filter((i) => i.afterCents !== i.beforeCents);
}

/** Hausse encore annulable : 24 h après l'avoir appliquée. */
export const RAISE_UNDO_HOURS = 24;
