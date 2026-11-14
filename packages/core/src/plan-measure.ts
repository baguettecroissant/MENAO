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

/** Côtés d'un polygone fermé : chaque point avec le suivant, le dernier avec le premier. */
function edges(points: readonly PlanPoint[]): [PlanPoint, PlanPoint][] {
  return points.flatMap((p, i) => {
    const q = points[(i + 1) % points.length];
    return q ? [[p, q] as [PlanPoint, PlanPoint]] : [];
  });
}

/** Aire d'un polygone en pixels carrés (formule du lacet), sans signe. */
export function polygonAreaPx(points: readonly PlanPoint[]): number {
  let twice = 0;
  for (const [p, q] of edges(points)) twice += p.x * q.y - q.x * p.y;
  return Math.abs(twice) / 2;
}

/** Périmètre d'un polygone fermé, en pixels. */
export function polygonPerimeterPx(points: readonly PlanPoint[]): number {
  let total = 0;
  for (const [p, q] of edges(points)) total += Math.hypot(q.x - p.x, q.y - p.y);
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
  const low = scales[0] ?? 0;
  const high = scales[scales.length - 1] ?? 0;
  const upper = scales[mid] ?? 0;
  const median = scales.length % 2 ? upper : ((scales[mid - 1] ?? upper) + upper) / 2;
  const spreadBp = Math.round(((high - low) / median) * 10_000);
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

// ---------------------------------------------------------------------------------------------
// Tracé d'un plan : contours des pièces d'une image et échelle calée
// ---------------------------------------------------------------------------------------------

/** Plus grande image dont les coordonnées rendues par le modèle sont celles de ses pixels. */
export const TRACE_MAX_SIDE = 2576;
export const TRACE_MAX_PIXELS = 3_600_000;
/** Pièces tracées au plus sur une image, et images tracées au plus par lecture. */
export const MAX_TRACED_ROOMS = 60;
export const MAX_TRACED_FILES = 4;

/** Une image peut-elle être tracée sans que le modèle la réduise ? */
export function traceable(width: number, height: number): boolean {
  return (
    width >= 200 &&
    height >= 200 &&
    Math.max(width, height) <= TRACE_MAX_SIDE &&
    width * height <= TRACE_MAX_PIXELS
  );
}

/** Réponse du modèle pour une image (consigne CONTOUR_SYSTEM de tender-sheet). */
export type PlanTraceRaw = {
  cotes?: { x1: number; y1: number; x2: number; y2: number; valeur_cm: number }[] | null;
  pieces?: { nom: string; contour: string }[] | null;
};

export type TracedRoom = {
  name: string;
  /** Contour en pixels de l'image, « x,y x,y … ». */
  contour: string;
  areaCm2: number;
  perimeterMm: number;
};

export type PlanTrace = {
  /** Fichier déposé (à partir de 1) et dimensions de son image, en pixels. */
  file: number;
  width: number;
  height: number;
  /** Échelle en micromètres par pixel (entier : 7 824 = 7,824 mm par pixel). */
  umPerPx: number;
  /** Écart entre les cotes qui calent l'échelle, en dix-millièmes. */
  spreadBp: number;
  /** Cotes gardées : extrémités en pixels entiers et valeur en mm. */
  anchors: { x1: number; y1: number; x2: number; y2: number; mm: number }[];
  rooms: TracedRoom[];
};

const cleanName = (value: unknown) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, 80) : "";

/**
 * Tracé d'une image remis en forme : échelle calée sur les cotes désignées, puis surface et
 * périmètre de chaque contour. Null si l'image ne peut pas être tracée, si l'échelle n'est pas
 * sûre ou si aucun contour n'est exploitable : mieux vaut ne rien estimer.
 */
export function buildPlanTrace(
  raw: PlanTraceRaw,
  file: number,
  width: number,
  height: number,
): PlanTrace | null {
  if (!traceable(width, height)) return null;
  const anchors: PlanAnchor[] = [];
  for (const k of (raw.cotes ?? []).slice(0, 12)) {
    if (![k.x1, k.y1, k.x2, k.y2, k.valeur_cm].every(finite)) continue;
    anchors.push({
      a: { x: k.x1, y: k.y1 },
      b: { x: k.x2, y: k.y2 },
      mm: Math.round(k.valeur_cm * 10),
    });
  }
  const scale = planScaleFromAnchors(anchors);
  if (!scale) return null;
  const rooms: TracedRoom[] = [];
  for (const p of raw.pieces ?? []) {
    const name = cleanName(p.nom);
    const points = parseContour(p.contour, width, height);
    if (!name || !points) continue;
    const measured = measureContour(points, scale);
    // Bornes d'une pièce : de 0,2 à 2 000 m².
    if (!measured || measured.areaCm2 < 2000 || measured.areaCm2 > 20_000_000) continue;
    if (rooms.length >= MAX_TRACED_ROOMS) break;
    rooms.push({
      name,
      contour: points.map((q) => `${Math.round(q.x)},${Math.round(q.y)}`).join(" "),
      ...measured,
    });
  }
  if (rooms.length === 0) return null;
  return {
    file,
    width,
    height,
    umPerPx: Math.round(scale.mmPerPx * 1000),
    spreadBp: scale.spreadBp,
    anchors: anchors
      .filter((k) => k.mm >= 100 && Math.hypot(k.b.x - k.a.x, k.b.y - k.a.y) >= 20)
      .map((k) => ({
        x1: Math.round(k.a.x),
        y1: Math.round(k.a.y),
        x2: Math.round(k.b.x),
        y2: Math.round(k.b.y),
        mm: k.mm,
      })),
    rooms,
  };
}

/** Nom d'une pièce ramené à l'essentiel, pour rapprocher le relevé et le tracé. */
export const planNameKey = (name: string) => nameKey(name);
const nameKey = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Pièce tracée qui correspond à une pièce du relevé : même nom, de préférence sur son plan. */
export function traceForRoom(
  traces: readonly PlanTrace[],
  room: { name: string; file: number | null },
): (TracedRoom & { file: number }) | null {
  const key = nameKey(room.name);
  if (!key) return null;
  const ordered = [...traces].sort(
    (a, b) => Number(b.file === room.file) - Number(a.file === room.file),
  );
  for (const trace of ordered) {
    const found = trace.rooms.find((r) => nameKey(r.name) === key);
    if (found) return { ...found, file: trace.file };
  }
  return null;
}

/**
 * Pièces du relevé sans surface que le tracé permet d'estimer : leur rang (à partir de 1), la
 * surface et le périmètre estimés. Une pièce qui a déjà une surface n'est jamais remplacée.
 */
export function estimatesFromTraces(
  rooms: readonly { name: string; file: number | null; areaCm2: number | null }[],
  traces: readonly PlanTrace[],
): { position: number; areaCm2: number; perimeterMm: number }[] {
  return rooms.flatMap((room, i) => {
    if (room.areaCm2 !== null) return [];
    const traced = traceForRoom(traces, room);
    return traced
      ? [{ position: i + 1, areaCm2: traced.areaCm2, perimeterMm: traced.perimeterMm }]
      : [];
  });
}

/** Contrôle : pièces mesurées par leurs cotes et aussi tracées, avec l'écart entre les deux. */
export function traceControl(
  rooms: readonly { name: string; file: number | null; areaCm2: number | null; source: string }[],
  traces: readonly PlanTrace[],
): { name: string; areaCm2: number; tracedCm2: number; gapBp: number }[] {
  return rooms.flatMap((room) => {
    if (room.areaCm2 === null || !["plan", "cotes", "photo"].includes(room.source)) return [];
    const traced = traceForRoom(traces, room);
    const gapBp = traced ? measureGapBp(traced.areaCm2, room.areaCm2) : null;
    return traced && gapBp !== null
      ? [{ name: room.name, areaCm2: room.areaCm2, tracedCm2: traced.areaCm2, gapBp }]
      : [];
  });
}

/** Dimensions d'une image JPEG lues dans son en-tête (marqueur SOF), sinon null. */
export function jpegSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) return null;
    const at = (offset: number) => bytes[i + offset] ?? 0;
    const marker = at(1);
    if (marker === 0xff) {
      i++;
      continue;
    }
    const length = (at(2) << 8) | at(3);
    // SOF0 à SOF15, sauf DHT (C4), JPG (C8) et DAC (CC).
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      const height = (at(5) << 8) | at(6);
      const width = (at(7) << 8) | at(8);
      return width > 0 && height > 0 ? { width, height } : null;
    }
    if (length < 2) return null;
    i += 2 + length;
  }
  return null;
}

// ---------------------------------------------------------------------------------------------
// Métré à la main (F-159, lot 3, ADR 0327) : mesures tracées par l'artisan sur l'image
// ---------------------------------------------------------------------------------------------

export const PLAN_MARK_KINDS = ["surface", "longueur", "comptage"] as const;
export type PlanMarkKind = (typeof PLAN_MARK_KINDS)[number];
export const MAX_PLAN_MARKS = 100;
export const MAX_MARK_POINTS = 200;

/** Longueur d'une ligne brisée ouverte, en pixels. */
export function polylineLengthPx(points: readonly PlanPoint[]): number {
  let total = 0;
  points.forEach((p, i) => {
    const q = points[i + 1];
    if (q) total += Math.hypot(q.x - p.x, q.y - p.y);
  });
  return total;
}

/** Échelle d'une cote désignée à la main : deux points et la valeur saisie, en mm par pixel. */
export function scaleFromCalibration(a: PlanPoint, b: PlanPoint, mm: number): number | null {
  const scale = planScaleFromAnchors([{ a, b, mm }]);
  return scale ? scale.mmPerPx : null;
}

export type PlanMarkMeasure =
  | { kind: "surface"; areaCm2: number; perimeterMm: number }
  | { kind: "longueur"; lengthMm: number }
  | { kind: "comptage"; count: number };

/**
 * Mesure d'un tracé à la main : surface et périmètre d'un polygone fermé (3 points au moins),
 * longueur d'une ligne brisée (2 points au moins), nombre de points d'un comptage. Une surface ou
 * une longueur demande une échelle ; null si le tracé est trop court ou sans échelle.
 */
export function measureMark(
  kind: PlanMarkKind,
  points: readonly PlanPoint[],
  mmPerPx: number | null,
): PlanMarkMeasure | null {
  if (points.length === 0 || points.length > MAX_MARK_POINTS) return null;
  if (kind === "comptage") return { kind, count: points.length };
  if (mmPerPx === null || !(mmPerPx > 0)) return null;
  if (kind === "surface") {
    const measured = measureContour(points, { mmPerPx });
    return measured ? { kind, ...measured } : null;
  }
  if (points.length < 2) return null;
  const lengthMm = Math.round(polylineLengthPx(points) * mmPerPx);
  return lengthMm > 0 ? { kind, lengthMm } : null;
}

/** Points d'un tracé écrits « x,y x,y … » en pixels entiers, pour l'enregistrer. */
export function contourText(points: readonly PlanPoint[]): string {
  return points.map((p) => `${Math.round(p.x)},${Math.round(p.y)}`).join(" ");
}
