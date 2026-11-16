/**
 * Outils du chat « Demander à MENAO » (F-160, ADR 0346) : description donnée au modèle, contrôle de
 * ce qu'il envoie (mètres → mm, m² → cm²), mise en forme des résultats pour lui (m, m², unités) et
 * réponse enregistrée. Sans import : lu tel quel par la fonction serveur plan-chat (Deno), qui
 * appelle les calculs de materials.ts et plan-chat-calc.ts entre ces deux étapes.
 */
type Schema = { type: "object"; properties: Record<string, unknown>; required: string[] };
export type ChatTool = { name: string; description: string; input_schema: Schema };

const num = (description: string) => ({ type: "number", description });
const int = (description: string) => ({ type: "integer", description });
const str = (description: string) => ({ type: "string", description });
const opening = {
  type: "object",
  properties: { largeur_m: num("Largeur (m)"), hauteur_m: num("Hauteur (m)") },
  required: ["largeur_m", "hauteur_m"],
};

export const CHAT_TOOLS: ChatTool[] = [
  {
    name: "calculer",
    description:
      "Fait un calcul exact (+ − × ÷ et parenthèses) avec des valeurs nommées. À utiliser pour tout calcul qui n'a pas d'outil dédié : ne calcule jamais de tête.",
    input_schema: {
      type: "object",
      properties: {
        expression: str("Par exemple « (longueur + 2) * hauteur »"),
        valeurs: {
          type: "object",
          additionalProperties: { type: "number" },
          description: "Valeurs nommées utilisées dans l'expression",
        },
      },
      required: ["expression"],
    },
  },
  {
    name: "cloison",
    description:
      "Cloison (2 faces) ou doublage (1 face) en plaques de plâtre sur ossature : plaques, rails, montants, vis, bande, enduit. Une longueur par cloison. Donne l'épaisseur écrite sur le plan : si elle ne correspond pas au type compté, l'outil le refuse et propose les types possibles.",
    input_schema: {
      type: "object",
      properties: {
        longueurs_m: {
          type: "array",
          items: { type: "number" },
          description: "Longueur de chaque cloison (m)",
        },
        hauteur_m: num("Hauteur sous plafond (m)"),
        faces: { type: "integer", enum: [1, 2], description: "2 : cloison ; 1 : doublage" },
        plaques_par_face: {
          type: "integer",
          enum: [1, 2],
          description: "1 : parement simple ; 2 : double",
        },
        montants_mm: {
          type: "integer",
          enum: [48, 70, 90],
          description: "Largeur des montants (48 par défaut)",
        },
        epaisseur_cm: num("Épaisseur de la cloison écrite sur le plan (cm), si elle y figure"),
      },
      required: ["longueurs_m", "hauteur_m"],
    },
  },
  {
    name: "plafond",
    description:
      "Plafond en plaques de plâtre sur fourrures : plaques, fourrures, suspentes, cornières.",
    input_schema: {
      type: "object",
      properties: {
        surface_m2: num("Surface du plafond (m²)"),
        perimetre_m: num("Périmètre (m), pour les cornières"),
      },
      required: ["surface_m2"],
    },
  },
  {
    name: "peinture",
    description:
      "Peinture des murs (périmètre × hauteur, ouvertures déduites) et des plafonds. Dimensions des ouvertures et rendement : ceux de l'artisan ; s'ils manquent, demande-les.",
    input_schema: {
      type: "object",
      properties: {
        pieces: {
          type: "array",
          items: {
            type: "object",
            properties: {
              nom: str("Pièce"),
              perimetre_m: num("Périmètre (m)"),
              hauteur_m: num("Hauteur (m)"),
              surface_m2: num("Surface au sol (m²)"),
              portes: int("Portes à déduire"),
              fenetres: int("Fenêtres à déduire"),
            },
            required: ["nom", "perimetre_m", "hauteur_m", "surface_m2", "portes", "fenetres"],
          },
        },
        porte: opening,
        fenetre: opening,
        plafonds: { type: "boolean", description: "Compter aussi les plafonds" },
        couches: int("Nombre de couches"),
        rendement_m2_par_litre: num("Rendement du produit (m² par litre et par couche)"),
      },
      required: ["pieces", "plafonds", "couches"],
    },
  },
  {
    name: "carrelage",
    description:
      "Carrelage : surface avec chutes, nombre de carreaux et de cartons. Le pourcentage de chutes vient de l'artisan.",
    input_schema: {
      type: "object",
      properties: {
        surface_m2: num("Surface à carreler (m²)"),
        chutes_pourcent: num("Chutes (%)"),
        carreau_largeur_cm: num("Largeur du carreau (cm)"),
        carreau_hauteur_cm: num("Hauteur du carreau (cm)"),
        carton_m2: num("Surface d'un carton (m²)"),
      },
      required: ["surface_m2", "chutes_pourcent", "carreau_largeur_cm", "carreau_hauteur_cm"],
    },
  },
  {
    name: "plinthes",
    description: "Linéaire de plinthes d'une pièce : périmètre moins la largeur des portes.",
    input_schema: {
      type: "object",
      properties: {
        perimetre_m: num("Périmètre de la pièce (m)"),
        largeurs_portes_m: {
          type: "array",
          items: { type: "number" },
          description: "Largeur de chaque porte (m)",
        },
      },
      required: ["perimetre_m", "largeurs_portes_m"],
    },
  },
  {
    name: "chercher_bibliotheque",
    description:
      "Cherche dans la bibliothèque de l'artisan les fournitures (prix d'achat) et les ouvrages (prix de vente, pose) qui correspondent à un mot.",
    input_schema: {
      type: "object",
      properties: { texte: str("Par exemple « BA13 » ou « cloison »") },
      required: ["texte"],
    },
  },
  {
    name: "chiffrer",
    description:
      "Chiffre des fournitures ou ouvrages : quantité × prix unitaire en centimes, total exact.",
    input_schema: {
      type: "object",
      properties: {
        lignes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              libelle: str("Libellé"),
              quantite: num("Quantité"),
              unite: str("Unité"),
              prix_unitaire_centimes: {
                type: ["integer", "null"],
                description: "Prix unitaire HT en centimes, ou null s'il est inconnu",
              },
            },
            required: ["libelle", "quantite", "unite", "prix_unitaire_centimes"],
          },
        },
      },
      required: ["lignes"],
    },
  },
  {
    name: "demander_precision",
    description:
      "Pose une question à l'artisan quand une information manque (ne devine jamais une mesure). Termine ton tour.",
    input_schema: {
      type: "object",
      properties: {
        question: str("La question, courte"),
        choix: {
          type: "array",
          items: { type: "string" },
          description: "Jusqu'à 4 réponses en un toucher",
        },
      },
      required: ["question", "choix"],
    },
  },
  {
    name: "repondre",
    description:
      "Donne la réponse finale : une phrase claire, puis le métré (une ligne par pièce ou par ouvrage) et les fournitures. Tous les chiffres viennent des outils. Termine ton tour.",
    input_schema: {
      type: "object",
      properties: {
        reponse: str("La réponse, en deux ou trois phrases"),
        titre: str("Titre du métré, par exemple « Cloisons 72/48 · hauteur 2,50 m »"),
        lignes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              libelle: str("Libellé"),
              quantite: num("Quantité"),
              unite: str("Unité"),
              detail: str("Détail du calcul"),
              piece: str("Pièce"),
            },
            required: ["libelle", "quantite", "unite"],
          },
        },
        fournitures: {
          type: "array",
          items: {
            type: "object",
            properties: {
              libelle: str("Libellé"),
              quantite: num("Quantité"),
              unite: str("Unité"),
              prix_unitaire_centimes: {
                type: ["integer", "null"],
                description: "Prix unitaire HT en centimes",
              },
            },
            required: ["libelle", "quantite", "unite"],
          },
        },
      },
      required: ["reponse", "titre", "lignes"],
    },
  },
];

export const TERMINAL_TOOLS = ["demander_precision", "repondre"] as const;

export type ChatCall =
  | { tool: "calculer"; expression: string; values: Record<string, number> }
  | {
      tool: "cloison";
      input: {
        runsMm: number[];
        heightMm: number;
        sides: 1 | 2;
        boardsPerFace: 1 | 2;
        studWidthMm: 48 | 70 | 90;
      };
    }
  | { tool: "plafond"; input: { areaCm2: number; perimeterMm: number | null } }
  | {
      tool: "peinture";
      input: {
        rooms: {
          name: string;
          perimeterMm: number;
          heightMm: number;
          areaCm2: number;
          doors: number;
          windows: number;
        }[];
        door: { widthMm: number; heightMm: number } | null;
        window: { widthMm: number; heightMm: number } | null;
        ceilings: boolean;
        coats: number;
        coverageM2PerLitreMilli: number | null;
      };
    }
  | {
      tool: "carrelage";
      input: {
        areaCm2: number;
        wastePercent: number;
        tileWidthMm: number;
        tileHeightMm: number;
        boxAreaCm2: number | null;
      };
    }
  | { tool: "plinthes"; input: { perimeterMm: number; doorWidthsMm: number[] } }
  | { tool: "chercher_bibliotheque"; text: string }
  | {
      tool: "chiffrer";
      lines: {
        label: string;
        quantityMilli: number;
        unit: string;
        unitPriceCents: number | null;
      }[];
    }
  | { tool: "demander_precision"; question: string; choices: string[] };

type Parsed = { ok: true; call: ChatCall } | { ok: false; error: string };

const isObj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const n = (v: unknown, min: number, max: number): number | null =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : null;
const text = (v: unknown, max: number): string | null =>
  typeof v === "string" && v.trim() && v.trim().length <= max ? v.trim() : null;
const mm = (m: number) => Math.round(m * 1000);
const cm2 = (m2: number) => Math.round(m2 * 10_000);

function openingOf(v: unknown): { widthMm: number; heightMm: number } | null | undefined {
  if (v === undefined || v === null) return null;
  if (!isObj(v)) return undefined;
  const w = n(v.largeur_m, 0.2, 6);
  const h = n(v.hauteur_m, 0.2, 4);
  return w === null || h === null ? undefined : { widthMm: mm(w), heightMm: mm(h) };
}

/** Contrôle d'un appel d'outil : valeurs plausibles, unités converties ; sinon une erreur claire. */
export function parseChatCall(name: string, input: unknown): Parsed {
  const fail = (error: string): Parsed => ({ ok: false, error });
  const v = isObj(input) ? input : {};
  switch (name) {
    case "calculer": {
      const expression = text(v.expression, 300);
      if (!expression) return fail("expression manquante");
      const values: Record<string, number> = {};
      if (isObj(v.valeurs)) {
        for (const [k, x] of Object.entries(v.valeurs))
          if (typeof x === "number" && Number.isFinite(x)) values[k] = x;
      }
      return { ok: true, call: { tool: "calculer", expression, values } };
    }
    case "cloison": {
      const runs = Array.isArray(v.longueurs_m) ? v.longueurs_m.map((x) => n(x, 0.05, 200)) : [];
      const height = n(v.hauteur_m, 1.5, 10);
      if (runs.length === 0 || runs.length > 60 || runs.some((x) => x === null))
        return fail("longueurs de cloison invalides");
      if (height === null) return fail("hauteur invalide (entre 1,5 et 10 m)");
      const sides = v.faces === 1 ? 1 : 2;
      const boardsPerFace = v.plaques_par_face === 2 ? 2 : 1;
      const studWidthMm = v.montants_mm === 70 ? 70 : v.montants_mm === 90 ? 90 : 48;
      // Épaisseur écrite sur le plan d'une cloison : montants + plaques de 12,5 mm (une ou deux par
      // face). Plus de 6 mm d'écart : le type compté n'est pas le bon. Pas pour un doublage, dont
      // l'épaisseur comprend l'isolant et le vide derrière l'ossature.
      const thickness =
        sides === 1 || v.epaisseur_cm === undefined || v.epaisseur_cm === null
          ? null
          : n(v.epaisseur_cm, 3, 40);
      if (thickness !== null) {
        const typeMm = (stud: number, per: number) => stud + 12.5 * per * sides;
        const written = thickness * 10;
        if (Math.abs(typeMm(studWidthMm, boardsPerFace) - written) > 6) {
          const fits = [48, 70, 90].flatMap((stud) =>
            [1, 2].flatMap((per) =>
              Math.abs(typeMm(stud, per) - written) <= 6
                ? [
                    `${Math.round(typeMm(stud, per))}/${stud} (${per === 1 ? "une plaque" : "deux plaques"} par face)`,
                  ]
                : [],
            ),
          );
          return fail(
            `épaisseur ${thickness.toLocaleString("fr-FR")} cm : ce n'est pas une ${Math.round(typeMm(studWidthMm, boardsPerFace))}/${studWidthMm}. ` +
              (fits.length ? `Types possibles : ${fits.join(", ")}. ` : "") +
              "Demande le type exact à l'artisan, ou précise plaques_par_face et montants_mm.",
          );
        }
      }
      return {
        ok: true,
        call: {
          tool: "cloison",
          input: {
            runsMm: runs.map((x) => mm(x as number)),
            heightMm: mm(height),
            sides,
            boardsPerFace,
            studWidthMm,
          },
        },
      };
    }
    case "plafond": {
      const area = n(v.surface_m2, 0.1, 10_000);
      if (area === null) return fail("surface invalide");
      const perimeter = v.perimetre_m === undefined ? null : n(v.perimetre_m, 0.1, 2_000);
      return {
        ok: true,
        call: {
          tool: "plafond",
          input: { areaCm2: cm2(area), perimeterMm: perimeter === null ? null : mm(perimeter) },
        },
      };
    }
    case "peinture": {
      const list = Array.isArray(v.pieces) ? v.pieces : [];
      const rooms = list.map((p) => {
        if (!isObj(p)) return null;
        const name = text(p.nom, 80);
        const per = n(p.perimetre_m, 0.5, 2_000);
        const h = n(p.hauteur_m, 1.5, 10);
        const area = n(p.surface_m2, 0.1, 10_000);
        const doors = n(p.portes, 0, 50);
        const windows = n(p.fenetres, 0, 50);
        if (
          !name ||
          per === null ||
          h === null ||
          area === null ||
          doors === null ||
          windows === null
        )
          return null;
        return {
          name,
          perimeterMm: mm(per),
          heightMm: mm(h),
          areaCm2: cm2(area),
          doors: Math.round(doors),
          windows: Math.round(windows),
        };
      });
      if (rooms.length === 0 || rooms.length > 200 || rooms.some((r) => r === null))
        return fail("pièces invalides");
      const door = openingOf(v.porte);
      const window = openingOf(v.fenetre);
      if (door === undefined || window === undefined) return fail("ouverture invalide");
      const coats = n(v.couches, 1, 5);
      if (coats === null || typeof v.plafonds !== "boolean")
        return fail("couches ou plafonds manquants");
      const coverage =
        v.rendement_m2_par_litre === undefined || v.rendement_m2_par_litre === null
          ? null
          : n(v.rendement_m2_par_litre, 1, 50);
      return {
        ok: true,
        call: {
          tool: "peinture",
          input: {
            rooms: rooms as NonNullable<(typeof rooms)[number]>[],
            door,
            window,
            ceilings: v.plafonds,
            coats: Math.round(coats),
            coverageM2PerLitreMilli: coverage === null ? null : Math.round(coverage * 1000),
          },
        },
      };
    }
    case "carrelage": {
      const area = n(v.surface_m2, 0.1, 10_000);
      const waste = n(v.chutes_pourcent, 0, 50);
      const w = n(v.carreau_largeur_cm, 1, 300);
      const h = n(v.carreau_hauteur_cm, 1, 300);
      if (area === null || waste === null || w === null || h === null)
        return fail("carrelage invalide");
      const box =
        v.carton_m2 === undefined || v.carton_m2 === null ? null : n(v.carton_m2, 0.05, 20);
      return {
        ok: true,
        call: {
          tool: "carrelage",
          input: {
            areaCm2: cm2(area),
            wastePercent: waste,
            tileWidthMm: Math.round(w * 10),
            tileHeightMm: Math.round(h * 10),
            boxAreaCm2: box === null ? null : cm2(box),
          },
        },
      };
    }
    case "plinthes": {
      const per = n(v.perimetre_m, 0.1, 2_000);
      const doors = Array.isArray(v.largeurs_portes_m)
        ? v.largeurs_portes_m.map((x) => n(x, 0.3, 6))
        : [];
      if (per === null || doors.some((x) => x === null)) return fail("plinthes invalides");
      return {
        ok: true,
        call: {
          tool: "plinthes",
          input: { perimeterMm: mm(per), doorWidthsMm: doors.map((x) => mm(x as number)) },
        },
      };
    }
    case "chercher_bibliotheque": {
      const t = text(v.texte, 80);
      return t
        ? { ok: true, call: { tool: "chercher_bibliotheque", text: t } }
        : fail("texte manquant");
    }
    case "chiffrer": {
      const list = Array.isArray(v.lignes) ? v.lignes : [];
      const lines = list.map((l) => {
        if (!isObj(l)) return null;
        const label = text(l.libelle, 200);
        const q = n(l.quantite, 0, 10_000_000);
        const unit = text(l.unite, 20);
        const price =
          l.prix_unitaire_centimes === null ? null : n(l.prix_unitaire_centimes, 0, 100_000_000);
        if (!label || q === null || !unit || price === undefined) return null;
        return {
          label,
          quantityMilli: Math.round(q * 1000),
          unit,
          unitPriceCents: price === null ? null : Math.round(price),
        };
      });
      if (lines.length === 0 || lines.length > 100 || lines.some((l) => l === null))
        return fail("lignes invalides");
      return {
        ok: true,
        call: { tool: "chiffrer", lines: lines as NonNullable<(typeof lines)[number]>[] },
      };
    }
    case "demander_precision": {
      const question = text(v.question, 500);
      const choices = Array.isArray(v.choix) ? v.choix.map((c) => text(c, 120)) : [];
      if (!question || choices.length > 4 || choices.some((c) => c === null))
        return fail("question invalide");
      return {
        ok: true,
        call: { tool: "demander_precision", question, choices: choices as string[] },
      };
    }
    default:
      return fail(`outil inconnu : ${name}`);
  }
}

// ---------------------------------------------------------------- résultats pour le modèle
const r2 = (x: number) => Math.round(x * 100) / 100;
type Step = { label: string; formula: string; value: number; unit: string };
const stepText = (s: Step) =>
  `${s.label} : ${s.formula} = ${s.value.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ${s.unit}`;

export function partitionForModel(r: {
  lengthMm: number;
  wallAreaCm2: number;
  boards: number;
  rails: number;
  studs: number;
  studLengthMm: number | null;
  screws: number | null;
  tapeMm: number;
  compoundG: number;
  packs: { screwBoxes: number | null; tapeRolls: number; compoundBags: number };
  steps: Step[];
  source: { label: string; url: string };
}) {
  return {
    longueur_ml: r2(r.lengthMm / 1000),
    surface_cloison_m2: r2(r.wallAreaCm2 / 10_000),
    plaques: r.boards,
    rails: r.rails,
    montants: r.studs,
    longueur_montant_m: r.studLengthMm === null ? null : r.studLengthMm / 1000,
    vis: r.screws,
    bande_ml: r2(r.tapeMm / 1000),
    enduit_kg: r2(r.compoundG / 1000),
    conditionnements: {
      boites_de_vis: r.packs.screwBoxes,
      rouleaux_de_bande: r.packs.tapeRolls,
      sacs_d_enduit: r.packs.compoundBags,
    },
    etapes: r.steps.map(stepText),
    source: `${r.source.label} (${r.source.url})`,
  };
}

export function ceilingForModel(r: {
  boards: number;
  furrings: number;
  furringMm: number;
  hangers: number;
  angles: number | null;
  steps: Step[];
  source: { label: string; url: string };
}) {
  return {
    plaques: r.boards,
    fourrures: r.furrings,
    fourrures_ml: r2(r.furringMm / 1000),
    suspentes: r.hangers,
    cornieres: r.angles,
    etapes: r.steps.map(stepText),
    source: `${r.source.label} (${r.source.url})`,
  };
}

export function paintForModel(r: {
  rooms: { name: string; grossCm2: number; wallsCm2: number; ceilingCm2: number }[];
  wallsCm2: number;
  ceilingsCm2: number;
  totalCm2: number;
  litresMilli: number | null;
}) {
  return {
    pieces: r.rooms.map((x) => ({
      nom: x.name,
      murs_bruts_m2: r2(x.grossCm2 / 10_000),
      murs_m2: r2(x.wallsCm2 / 10_000),
      plafond_m2: r2(x.ceilingCm2 / 10_000),
    })),
    murs_m2: r2(r.wallsCm2 / 10_000),
    plafonds_m2: r2(r.ceilingsCm2 / 10_000),
    total_m2: r2(r.totalCm2 / 10_000),
    litres: r.litresMilli === null ? null : r2(r.litresMilli / 1000),
  };
}

export function tileForModel(r: { areaWithWasteCm2: number; tiles: number; boxes: number | null }) {
  return {
    surface_avec_chutes_m2: r2(r.areaWithWasteCm2 / 10_000),
    carreaux: r.tiles,
    cartons: r.boxes,
  };
}

export function priceForModel(r: {
  lines: { label: string; quantityMilli: number; totalCents: number | null }[];
  totalCents: number;
  missing: string[];
}) {
  return {
    lignes: r.lines.map((l) => ({
      libelle: l.label,
      quantite: l.quantityMilli / 1000,
      total_centimes: l.totalCents,
    })),
    total_centimes: r.totalCents,
    prix_manquants: r.missing,
  };
}

// ---------------------------------------------------------------- réponse enregistrée
export type ChatAnswer = {
  titre: string;
  lignes: {
    libelle: string;
    quantite: number;
    unite: string;
    detail: string | null;
    piece: string | null;
  }[];
  fournitures: {
    libelle: string;
    quantite: number;
    unite: string;
    prix_unitaire_centimes: number | null;
    total_centimes: number | null;
  }[];
  total_centimes: number | null;
  etapes: string[];
};

/** Réponse finale (outil « repondre ») contrôlée, avec les totaux recalculés par MENAO. */
export function chatAnswerFromTool(
  input: unknown,
  steps: string[],
): { ok: true; answer: string; result: ChatAnswer } | { ok: false; error: string } {
  const v = isObj(input) ? input : {};
  const answer = text(v.reponse, 6000);
  const title = text(v.titre, 200);
  if (!answer || !title) return { ok: false, error: "réponse ou titre manquant" };
  const lines = (Array.isArray(v.lignes) ? v.lignes : []).flatMap((l) => {
    if (!isObj(l)) return [];
    const label = text(l.libelle, 200);
    const q = n(l.quantite, 0, 10_000_000);
    const unit = text(l.unite, 20);
    return label && q !== null && unit
      ? [
          {
            libelle: label,
            quantite: q,
            unite: unit,
            detail: text(l.detail, 300),
            piece: text(l.piece, 80),
          },
        ]
      : [];
  });
  const supplies = (Array.isArray(v.fournitures) ? v.fournitures : []).flatMap((l) => {
    if (!isObj(l)) return [];
    const label = text(l.libelle, 200);
    const q = n(l.quantite, 0, 10_000_000);
    const unit = text(l.unite, 20);
    const price = n(l.prix_unitaire_centimes, 0, 100_000_000);
    if (!label || q === null || !unit) return [];
    const unitPrice = price === null ? null : Math.round(price);
    return [
      {
        libelle: label,
        quantite: q,
        unite: unit,
        prix_unitaire_centimes: unitPrice,
        total_centimes: unitPrice === null ? null : Math.round(unitPrice * q),
      },
    ];
  });
  const priced = supplies.filter((s) => s.total_centimes !== null);
  return {
    ok: true,
    answer,
    result: {
      titre: title,
      lignes: lines.slice(0, 200),
      fournitures: supplies.slice(0, 100),
      total_centimes: priced.length
        ? priced.reduce((sum, s) => sum + (s.total_centimes ?? 0), 0)
        : null,
      etapes: steps.slice(0, 60),
    },
  };
}
