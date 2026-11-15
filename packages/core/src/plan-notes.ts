// Ouvrages écrits sur les plans (F-159 lot 6, ADR 0330) : les notes de l'architecte (cloisons,
// faux plafonds, déposes, équipements) et les menuiseries à repère, relevées image par image par
// le modèle de langage, deviennent des ouvrages du relevé rangés par métier. Le modèle recopie ;
// ici on dédoublonne entre plans et on donne la quantité quand elle se déduit sans rien deviner :
// la surface de la pièce pour un ouvrage qui la couvre (faux plafond, dalle, ragréage), une unité
// pour un équipement ou une menuiserie. Une cloison, un doublage ou un caisson restent « à
// mesurer » : leur longueur ne se lit pas dans une note.
// Aucun import : ce fichier est aussi lu par Deno (tender-sheet).

type NoteKind = "surface" | "lineaire" | "volume" | "nombre";

/** Lot à part des déposes et démolitions (code gardé avec les métiers de l'appel d'offres). */
export const DEMOLITION_LOT = "demolition";

/** Métiers proposés au modèle pour ranger une note (codes de la table des métiers). */
export const NOTE_TRADES = [
  "macon",
  "plaquiste",
  "carreleur",
  "peintre",
  "menuisier",
  "plombier",
  "electricien",
  "chauffagiste",
  "couvreur",
  "charpentier",
  "facadier",
  "serrurier",
  "terrassier",
  "paysagiste",
] as const;

/** Images lues au plus pour les notes, et ouvrages gardés au plus par lecture. */
export const MAX_NOTE_IMAGES = 6;
export const MAX_NOTE_WORKS = 150;

/** Réponse du modèle pour une image (photo d'un plan ou page de PDF rendue en image). */
export type PlanNotesRaw = {
  type_plan?: string;
  pieces?: { nom: string; sol: string; murs: string; plafond: string }[] | null;
  menuiseries?:
    | {
        repere: string;
        designation: string;
        largeur_cm: number | null;
        hauteur_cm: number | null;
        details: string;
      }[]
    | null;
  ouvrages?:
    | {
        metier: string;
        action: string;
        designation: string;
        piece: string;
        quantite: number | null;
        unite: string;
      }[]
    | null;
};

export type PlanNoteImage = { file: number; page: number; raw: PlanNotesRaw };
/** Pièce du relevé : `estimated` si sa surface vient d'une photo ou d'un tracé à l'échelle. */
export type PlanNoteRoom = { name: string; areaCm2: number | null; estimated?: boolean };
/** Ouvrage écrit : la pièce où il se trouve, et s'il s'agit d'une dépose. */
/** Même forme qu'un ouvrage mesuré du relevé (PlanWork), avec la pièce et la dépose. */
export type PlanNoteWork = {
  name: string;
  kind: NoteKind;
  /** Quantité en millièmes de l'unité ; null : à mesurer. */
  quantityMilli: number | null;
  /** Écrite dans la note, tirée de la surface de la pièce, ou une unité par note. */
  source: "plan" | "calcul" | "unite";
  detail: string | null;
  trade: string | null;
  file: number;
  page: number;
  uncertain: boolean;
  room: string | null;
  removal: boolean;
};

/** Schéma JSON de la lecture des notes d'une image (sortie structurée du modèle). */
export function planNotesJsonSchema(): Record<string, unknown> {
  const text = { type: "string" };
  const nullable = { type: ["number", "null"] };
  const object = (properties: Record<string, unknown>) => ({
    type: "object",
    additionalProperties: false,
    required: Object.keys(properties),
    properties,
  });
  return object({
    type_plan: text,
    pieces: { type: "array", items: object({ nom: text, sol: text, murs: text, plafond: text }) },
    menuiseries: {
      type: "array",
      items: object({
        repere: text,
        designation: text,
        largeur_cm: nullable,
        hauteur_cm: nullable,
        details: text,
      }),
    },
    ouvrages: {
      type: "array",
      items: object({
        metier: text,
        action: { type: "string", enum: ["creer", "deposer", "conserver"] },
        designation: text,
        piece: text,
        quantite: nullable,
        unite: text,
      }),
    },
  });
}

const clean = (value: unknown, max: number): string =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";

/** Texte comparé sans accents, casse ni ponctuation. */
const key = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Ouvrages qui se mesurent en longueur, d'un tracé. */
const LINEAR = /\b(caissons?|plinthes?|corniches?|goulottes?|garde corps|main courante)\b/;
/** Ouvrages verticaux : leur surface dépend d'une longueur à tracer. */
const WALL = /\b(cloisons?|contre cloisons?|doublages?|murs?|murets?|faience|credence)\b/;
/** Ouvrages qui couvrent le sol ou le plafond de la pièce. */
const ROOM_AREA =
  /\b(plafonds?|dalles?|dallage|ragreage|chape|planchers?|parquets?|carrelages?|tomettes?|moquette|revetements?|sols?)\b/;

const UNITS: Record<string, NoteKind> = {
  m2: "surface",
  ml: "lineaire",
  m: "lineaire",
  m3: "volume",
  u: "nombre",
  unite: "nombre",
  unites: "nombre",
};

/**
 * Ouvrages écrits sur les plans, dans l'ordre de lecture. `rooms` : pièces du relevé (surfaces
 * lues, calculées ou estimées) ; `limit` : place laissée par les ouvrages déjà relevés.
 */
export function planNoteWorks(
  images: readonly PlanNoteImage[],
  rooms: readonly PlanNoteRoom[],
  limit: number = MAX_NOTE_WORKS,
): PlanNoteWork[] {
  const roomKeys = rooms.map((r) => key(r.name));
  const works: PlanNoteWork[] = [];
  const seen = new Set<string>();
  const marks = new Set<string>();
  const push = (work: PlanNoteWork) => {
    if (works.length < Math.min(limit, MAX_NOTE_WORKS)) works.push(work);
  };

  for (const image of images) {
    const notes = Array.isArray(image.raw?.ouvrages) ? image.raw.ouvrages : [];
    for (const note of notes) {
      if (!note || note.action === "conserver") continue;
      const name = clean(note.designation, 120);
      if (!name) continue;
      const trade = (NOTE_TRADES as readonly string[]).includes(note.metier) ? note.metier : null;
      const removal = note.action === "deposer";
      const written = clean(note.piece, 80);
      const at = written ? roomKeys.indexOf(key(written)) : -1;
      const room = at >= 0 ? (rooms[at] ?? null) : null;
      const where = room?.name ?? (written || null);
      const id = [trade, removal, key(name), key(where ?? "")].join("|");
      if (seen.has(id)) continue;
      seen.add(id);

      const text = key(name);
      let kind: NoteKind;
      let quantityMilli: number | null = null;
      let source: PlanNoteWork["source"] = "plan";
      let detail: string | null = null;
      let uncertain = false;
      const unitText = clean(note.unite, 10).toLowerCase().replace("²", "2").replace("³", "3");
      const unit = UNITS[key(unitText) || "u"] ?? null;
      const amount =
        typeof note.quantite === "number" && Number.isFinite(note.quantite) && note.quantite > 0
          ? note.quantite
          : null;
      if (amount !== null && unit && amount <= 1_000_000) {
        // Quantité écrite dans la note.
        kind = unit;
        quantityMilli =
          unit === "nombre" ? Math.round(amount) * 1000 || null : Math.round(amount * 1000) || null;
      } else if (LINEAR.test(text)) {
        kind = "lineaire";
      } else if (WALL.test(text)) {
        kind = "surface";
      } else if (ROOM_AREA.test(text)) {
        kind = "surface";
        if (room && room.areaCm2 !== null && room.areaCm2 > 0) {
          quantityMilli = Math.round(room.areaCm2 / 10);
          source = "calcul";
          detail = `Surface de la pièce : ${room.name}`;
          uncertain = room.estimated === true;
        }
      } else {
        kind = "nombre";
        quantityMilli = 1000;
        source = "unite";
      }
      push({
        name,
        kind,
        quantityMilli,
        source,
        detail,
        trade,
        file: image.file,
        page: image.page,
        uncertain,
        room: where,
        removal,
      });
    }

    const joinery = Array.isArray(image.raw?.menuiseries) ? image.raw.menuiseries : [];
    for (const item of joinery) {
      if (!item) continue;
      const mark = clean(item.repere, 20);
      const label = clean(item.designation, 70);
      if (!mark || marks.has(key(mark))) continue;
      marks.add(key(mark));
      const side = (n: unknown) =>
        typeof n === "number" && Number.isFinite(n) && n > 0 && n <= 2000 ? Math.round(n) : null;
      const [width, height] = [side(item.largeur_cm), side(item.hauteur_cm)];
      const size = width && height ? `${width} × ${height} cm` : "";
      push({
        name: [mark, label, size].filter(Boolean).join(" · "),
        kind: "nombre",
        quantityMilli: 1000,
        source: "unite",
        detail: null,
        trade: "menuisier",
        file: image.file,
        page: image.page,
        uncertain: false,
        room: null,
        removal: false,
      });
    }
  }
  return works;
}

/** Lots que les ouvrages écrits demandent : la démolition d'abord, puis les métiers. */
export function noteLots(works: readonly { trade: string | null; removal: boolean }[]): string[] {
  const trades = works.flatMap((w) => (w.removal || !w.trade ? [] : [w.trade]));
  return [...(works.some((w) => w.removal) ? [DEMOLITION_LOT] : []), ...new Set(trades)];
}

/** Repère, type et dimensions d'une menuiserie relevée (« F-01 · Fenêtre OF · 167 × 208 cm »). */
export function joineryParts(name: string): { mark: string; label: string; size: string } | null {
  const parts = name.split(" · ");
  const mark = parts[0] ?? "";
  if (parts.length < 2 || !/^[A-Za-z]{1,4}[- ]?\d{0,3}[A-Za-z]?$/.test(mark)) return null;
  const last = parts[parts.length - 1] ?? "";
  const sized = parts.length > 2 && /^\d+ × \d+ cm$/.test(last);
  return {
    mark,
    label: parts.slice(1, sized ? -1 : undefined).join(" · "),
    size: sized ? last.replace(/ cm$/, "") : "",
  };
}

/** Chiffres des ouvrages écrits : tirés des pièces mesurées, et à mesurer d'un tracé. */
export function planNoteFigures(
  works: readonly { quantityMilli: number | null; source: string; room: string | null }[],
) {
  return {
    fromRooms: works.filter((w) => w.quantityMilli !== null && w.source === "calcul" && w.room)
      .length,
    toMeasure: works.filter((w) => w.quantityMilli === null).length,
  };
}

/** Ouvrage relevé dans les notes de l'architecte, et non mesuré sur un plan de terrain. */
export const isWrittenWork = (w: { room: string | null; removal: boolean; source: string }) =>
  w.room !== null || w.removal || w.source === "unite";
