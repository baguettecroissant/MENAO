import { describe, expect, it } from "vitest";
import {
  DEMOLITION_LOT,
  finishesFromNotes,
  joineryParts,
  noteLots,
  planNoteWorks,
  planRoomNotes,
  type PlanNotesRaw,
} from "../src/plan-notes";

const rooms = [
  { name: "Salon", areaCm2: 171_000, estimated: false },
  { name: "Salle d'eau", areaCm2: 50_600, estimated: true },
  { name: "Entrée", areaCm2: null, estimated: false },
];

const raw = (patch: Partial<PlanNotesRaw>): PlanNotesRaw => ({
  type_plan: "cloisons",
  pieces: [],
  menuiseries: [],
  ouvrages: [],
  ...patch,
});
const work = (
  designation: string,
  piece = "",
  metier = "plaquiste",
  action = "creer",
  quantite: number | null = null,
  unite = "",
) => ({ metier, action, designation, piece, quantite, unite });

describe("planNoteWorks", () => {
  it("donne la surface de la pièce à un ouvrage qui la couvre", () => {
    const [w] = planNoteWorks(
      [{ file: 2, page: 1, raw: raw({ ouvrages: [work("Faux plafond suspendu BA13", "salon")] }) }],
      rooms,
    );
    expect(w).toMatchObject({
      name: "Faux plafond suspendu BA13",
      kind: "surface",
      quantityMilli: 17_100,
      source: "calcul",
      detail: "Surface de la pièce : Salon",
      trade: "plaquiste",
      room: "Salon",
      removal: false,
      file: 2,
      page: 1,
      uncertain: false,
    });
  });

  it("marque « à vérifier » une surface tirée d'une pièce estimée", () => {
    const [w] = planNoteWorks(
      [{ file: 1, page: 1, raw: raw({ ouvrages: [work("Faux plafond", "SALLE D’EAU")] }) }],
      rooms,
    );
    expect(w).toMatchObject({ quantityMilli: 5_060, room: "Salle d'eau", uncertain: true });
  });

  it("laisse à mesurer une cloison, un caisson et une pièce sans surface", () => {
    const works = planNoteWorks(
      [
        {
          file: 1,
          page: 1,
          raw: raw({
            ouvrages: [
              work("Cloison BA13 de 10 cm avec laine de bois 4 cm", "Salon"),
              work("Caisson BA13, hauteur 40 cm", "WC"),
              work("Faux plafond rampant", "Entrée"),
              work("Dalle à démolir et évacuer", "Cuisine", "macon", "deposer"),
            ],
          }),
        },
      ],
      rooms,
    );
    expect(works.map((w) => [w.kind, w.quantityMilli, w.source])).toEqual([
      ["surface", null, "plan"],
      ["lineaire", null, "plan"],
      ["surface", null, "plan"],
      ["surface", null, "plan"],
    ]);
    // La pièce écrite est gardée même si le relevé ne la connaît pas.
    expect(works[1]?.room).toBe("WC");
    expect(works[3]).toMatchObject({ removal: true, trade: "macon", room: "Cuisine" });
  });

  it("compte une unité pour un équipement, et garde une quantité écrite", () => {
    const works = planNoteWorks(
      [
        {
          file: 1,
          page: 1,
          raw: raw({
            ouvrages: [
              work("Baignoire à déposer", "Salle d'eau", "plombier", "deposer"),
              work("Isolation des combles", "", "plaquiste", "creer", 42.5, "m²"),
              work("Radiateur existant", "Salon", "chauffagiste", "conserver"),
              work("Machin", "", "astronaute"),
            ],
          }),
        },
      ],
      rooms,
    );
    expect(works).toHaveLength(3);
    expect(works[0]).toMatchObject({ kind: "nombre", quantityMilli: 1000, source: "unite" });
    expect(works[1]).toMatchObject({ kind: "surface", quantityMilli: 42_500, source: "plan" });
    expect(works[2]).toMatchObject({ name: "Machin", trade: null });
  });

  it("ne garde qu'une fois une note répétée sur plusieurs plans", () => {
    const note = work("Cloison BA13 de 7 cm", "Salle d'eau");
    const works = planNoteWorks(
      [
        { file: 1, page: 1, raw: raw({ ouvrages: [note, work("Cloison BA13 de 7 cm", "Salon")] }) },
        {
          file: 2,
          page: 1,
          raw: raw({ ouvrages: [{ ...note, designation: "cloison BA13 de 7 cm." }] }),
        },
      ],
      rooms,
    );
    expect(works.map((w) => w.room)).toEqual(["Salle d'eau", "Salon"]);
  });

  it("fait un ouvrage par menuiserie à repère, avec ses dimensions", () => {
    const joinery = (repere: string, largeur_cm: number | null, hauteur_cm: number | null) => ({
      repere,
      designation: "Fenêtre OF cintrée, 2 vantaux",
      largeur_cm,
      hauteur_cm,
      details: "volet bois",
    });
    const works = planNoteWorks(
      [
        {
          file: 1,
          page: 1,
          raw: raw({ menuiseries: [joinery("F-01", 167, 208), joinery("PE", null, 220)] }),
        },
        { file: 2, page: 1, raw: raw({ menuiseries: [joinery("f-01", 167, 208)] }) },
      ],
      rooms,
    );
    expect(works).toHaveLength(2);
    expect(works[0]).toMatchObject({
      name: "F-01 · Fenêtre OF cintrée, 2 vantaux · 167 × 208 cm",
      kind: "nombre",
      quantityMilli: 1000,
      source: "unite",
      trade: "menuisier",
    });
    expect(works[1]?.name).toBe("PE · Fenêtre OF cintrée, 2 vantaux");
    expect(joineryParts(works[0]?.name ?? "")).toEqual({
      mark: "F-01",
      label: "Fenêtre OF cintrée, 2 vantaux",
      size: "167 × 208",
    });
    expect(joineryParts("Terrasse bois")).toBeNull();
  });

  it("s'arrête à la place laissée par le relevé", () => {
    const ouvrages = Array.from({ length: 30 }, (_, i) => work(`Ouvrage ${i}`));
    expect(planNoteWorks([{ file: 1, page: 1, raw: raw({ ouvrages }) }], rooms, 12)).toHaveLength(
      12,
    );
  });

  it("supporte une réponse abîmée", () => {
    expect(planNoteWorks([{ file: 1, page: 1, raw: {} }], rooms)).toEqual([]);
    expect(
      planNoteWorks(
        [{ file: 1, page: 1, raw: { ouvrages: [work("  "), null] } as unknown as PlanNotesRaw }],
        rooms,
      ),
    ).toEqual([]);
  });
});

describe("noteLots", () => {
  it("liste les métiers des ouvrages, la démolition en tête", () => {
    expect(
      noteLots([
        { trade: "plaquiste", removal: false },
        { trade: "macon", removal: true },
        { trade: null, removal: false },
        { trade: "plaquiste", removal: false },
      ]),
    ).toEqual([DEMOLITION_LOT, "plaquiste"]);
  });
});

describe("revêtements lus sur le plan (lot 6, PR B)", () => {
  const piece = (nom: string, sol = "", murs = "", plafond = "") => ({ nom, sol, murs, plafond });

  it("rattache à chaque pièce du relevé ce que les plans écrivent pour elle", () => {
    const notes = planRoomNotes(
      [
        {
          file: 1,
          page: 1,
          raw: raw({ pieces: [piece("SALON", "parquet existant à poncer et huiler")] }),
        },
        {
          file: 2,
          page: 1,
          raw: raw({
            pieces: [piece("Salon", "autre note", "mur à peindre"), piece("Cave", "terre battue")],
          }),
        },
      ],
      rooms,
    );
    expect(notes).toEqual([
      { floor: "parquet existant à poncer et huiler", walls: "mur à peindre", ceiling: "" },
      null,
      null,
    ]);
  });

  it("reconnaît les sols neufs et les sols existants conservés", () => {
    const floor = (sol: string) => finishesFromNotes({ floor: sol, walls: "", ceiling: "" }).floor;
    expect(floor("ragréage sur dalle BA créée, revêtement de sol souple")).toBe("sol_souple");
    expect(floor("tomette existante à nettoyer")).toBe("existant_nettoyer");
    expect(floor("parquet existant à poncer et huiler")).toBe("parquet_poncer");
    expect(floor("parquet chêne massif")).toBe("parquet");
    expect(floor("carrelage grès cérame 60 × 60")).toBe("carrelage");
    expect(floor("voir détail")).toBeNull();
    expect(floor("")).toBeNull();
  });

  it("lit la faïence et sa hauteur, la peinture, le faux plafond", () => {
    expect(
      finishesFromNotes({
        floor: "",
        walls: "faïence ht 220 cm, crédence carrelée ht 20 cm",
        ceiling: "faux plafond suspendu BA13, plénum 10 cm",
      }),
    ).toEqual({ floor: null, walls: "faience", tileHeightMm: 2200, ceiling: "plaque" });
    expect(
      finishesFromNotes({
        floor: "",
        walls: "Faïence toute hauteur",
        ceiling: "plafond à peindre",
      }),
    ).toEqual({ floor: null, walls: "faience", tileHeightMm: null, ceiling: "peinture" });
    expect(
      finishesFromNotes({ floor: "", walls: "faïence h. 2,10 m", ceiling: "" }).tileHeightMm,
    ).toBe(2100);
    expect(finishesFromNotes({ floor: "", walls: "mur à peindre", ceiling: "" })).toMatchObject({
      walls: "peinture",
      ceiling: null,
    });
    // Une crédence seule ne dit pas le revêtement des murs.
    expect(
      finishesFromNotes({ floor: "", walls: "crédence carrelée ht 40 cm", ceiling: "" }).walls,
    ).toBeNull();
  });
});
