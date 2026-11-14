// Mesure à l'échelle sur un plan (F-159, lot 2, ADR 0326). Le modèle trace le contour d'une pièce
// en pixels de l'image et désigne des cotes écrites (deux points et leur valeur) ; ce fichier cale
// l'échelle sur ces cotes et calcule surface et périmètre. Une quantité ainsi obtenue est une
// estimation (« Estimé »), jamais une cote de l'architecte.
// Aucun import : ce fichier est aussi lu par Deno (tender-sheet).

export type PlanPoint = { x: number; y: number };

/** Cote écrite désignée sur l'image : ses deux extrémités en pixels et sa valeur en millimètres. */
export type PlanAnchor = { a: PlanPoint; b: PlanPoint; mm: number };

/** Contour le plus long accepté : au-delà, le tracé est jugé douteux. */
export const MAX_CONTOUR_POINTS = 40;
/** Écart toléré entre les échelles tirées de deux cotes, en dix-millièmes (5 %). */
export const SCALE_TOLERANCE_BP = 500;

const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

/**
 * Contour écrit « x,y x,y … » (pixels) en points ; null s'il est mal écrit, a moins de 3 points
 * ou plus de 40, ou sort de l'image de `width` × `height` pixels (5 % de marge).
 */
export function parseContour(text: unknown, width: number, height: number): PlanPoint[] | null {
  if (typeof text !== "string") return null;
  const parts = text.trim().split(/\s+/);
  if (parts.length < 3 || parts.length > MAX_CONTOUR_POINTS) return null;
  const points: PlanPoint[] = [];
  for (const part of parts) {
    const m = /^(-?\d{1,5}(?:\.\d+)?),(-?\d{1,5}(?:\.\d+)?)$/.exec(part);
    if (!m) return null;
    const x = Number(m[1]);
    const y = Number(m[2]);
    if (x < -0.05 * width || x > 1.05 * width || y < -0.05 * height || y > 1.05 * height) {
      return null;
    }
    points.push({ x, y });
  }
  return points;
}

/** Aire d'un polygone en pixels carrés (formule du lacet), sans signe. */
export function polygonAreaPx(points: readonly PlanPoint[]): number {
  let twice = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!;
    const q = points[(i + 1) % points.length]!;
    twice += p.x * q.y - q.x * p.y;
  }
  return Math.abs(twice) / 2;
}

/** Périmètre d'un polygone fermé, en pixels. */
export function polygonPerimeterPx(points: readonly PlanPoint[]): number {
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!;
    const q = points[(i + 1) % points.length]!;
    total += Math.hypot(q.x - p.x, q.y - p.y);
  }
  return total;
}

export type PlanScale = {
  /** Millimètres réels par pixel de l'image. */
  mmPerPx: number;
  /** Cotes gardées pour caler l'échelle. */
  anchors: number;
  /** Écart entre la plus petite et la plus grande échelle gardées, en dix-millièmes. */
  spreadBp: number;
};

/**
 * Échelle calée sur les cotes désignées : médiane des échelles (mm par pixel), après avoir écarté
 * les cotes trop courtes (moins de 20 px) ou hors bornes. Null sans cote exploitable, ou si les
 * cotes gardées se contredisent de plus de 5 % : une échelle douteuse ne mesure rien.
 */
export function planScaleFromAnchors(anchors: readonly PlanAnchor[]): PlanScale | null {
  const scales: number[] = [];
  for (const anchor of anchors) {
    if (!finite(anchor.mm) || anchor.mm < 100 || anchor.mm > 200_000) continue;
    const px = Math.hypot(anchor.b.x - anchor.a.x, anchor.b.y - anchor.a.y);
    if (!finite(px) || px < 20) continue;
    scales.push(anchor.mm / px);
  }
  if (scales.length === 0) return null;
  scales.sort((a, b) => a - b);
  const mid = Math.floor(scales.length / 2);
  const median = scales.length % 2 ? scales[mid]! : (scales[mid - 1]! + scales[mid]!) / 2;
  const spreadBp = Math.round(((scales.at(-1)! - scales[0]!) / median) * 10_000);
  if (spreadBp > SCALE_TOLERANCE_BP) return null;
  return { mmPerPx: median, anchors: scales.length, spreadBp };
}

/** Surface (cm²) et périmètre (mm) d'un contour, à l'échelle donnée ; null si le contour est vide. */
export function measureContour(
  points: readonly PlanPoint[],
  scale: Pick<PlanScale, "mmPerPx">,
): { areaCm2: number; perimeterMm: number } | null {
  if (points.length < 3) return null;
  const areaCm2 = Math.round((polygonAreaPx(points) * scale.mmPerPx * scale.mmPerPx) / 100);
  const perimeterMm = Math.round(polygonPerimeterPx(points) * scale.mmPerPx);
  return areaCm2 > 0 && perimeterMm > 0 ? { areaCm2, perimeterMm } : null;
}

/** Écart d'une estimation par rapport à une mesure de référence, en dix-millièmes signés. */
export function measureGapBp(estimated: number, reference: number): number | null {
  return reference > 0 ? Math.round(((estimated - reference) / reference) * 10_000) : null;
}
