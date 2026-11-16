import { describe, expect, it } from "vitest";
import { partitionTakeoff } from "../src/materials";
import {
  CHAT_TOOLS,
  chatAnswerFromTool,
  parseChatCall,
  partitionForModel,
} from "../src/plan-chat-tools";

describe("CHAT_TOOLS", () => {
  it("décrit chaque outil avec un schéma d'objet", () => {
    expect(CHAT_TOOLS.map((t) => t.name)).toEqual([
      "calculer",
      "cloison",
      "plafond",
      "peinture",
      "carrelage",
      "plinthes",
      "chercher_bibliotheque",
      "chiffrer",
      "demander_precision",
      "repondre",
    ]);
    for (const tool of CHAT_TOOLS) expect(tool.input_schema.type).toBe("object");
  });
});

describe("parseChatCall", () => {
  it("convertit les mètres en mm et les m² en cm²", () => {
    expect(parseChatCall("cloison", { longueurs_m: [7.58, 3], hauteur_m: 2.5 })).toEqual({
      ok: true,
      call: {
        tool: "cloison",
        input: {
          runsMm: [7580, 3000],
          heightMm: 2500,
          sides: 2,
          boardsPerFace: 1,
          studWidthMm: 48,
        },
      },
    });
    expect(parseChatCall("plafond", { surface_m2: 17.88, perimetre_m: 16.94 })).toEqual({
      ok: true,
      call: { tool: "plafond", input: { areaCm2: 178_800, perimeterMm: 16_940 } },
    });
    expect(
      parseChatCall("chiffrer", {
        lignes: [{ libelle: "Enduit", quantite: 32.67, unite: "kg", prix_unitaire_centimes: 74 }],
      }),
    ).toEqual({
      ok: true,
      call: {
        tool: "chiffrer",
        lines: [{ label: "Enduit", quantityMilli: 32_670, unit: "kg", unitPriceCents: 74 }],
      },
    });
  });

  it("épaisseur écrite sur le plan : refusée si elle ne correspond pas au type compté", () => {
    // 10 cm : ni une 72/48 ; 98/48 (deux plaques par face) ou 95/70 (une plaque par face).
    const wrong = parseChatCall("cloison", {
      longueurs_m: [3.4],
      hauteur_m: 2.7,
      epaisseur_cm: 10,
    });
    expect(wrong.ok).toBe(false);
    expect(wrong.ok ? "" : wrong.error).toMatch(/98\/48.*95\/70|95\/70.*98\/48/);
    expect(
      parseChatCall("cloison", {
        longueurs_m: [3.4],
        hauteur_m: 2.7,
        epaisseur_cm: 10,
        plaques_par_face: 2,
      }),
    ).toMatchObject({ ok: true, call: { input: { boardsPerFace: 2, studWidthMm: 48 } } });
    expect(
      parseChatCall("cloison", {
        longueurs_m: [3.4],
        hauteur_m: 2.7,
        epaisseur_cm: 9.5,
        montants_mm: 70,
      }),
    ).toMatchObject({ ok: true, call: { input: { boardsPerFace: 1, studWidthMm: 70 } } });
    expect(
      parseChatCall("cloison", { longueurs_m: [3.4], hauteur_m: 2.7, epaisseur_cm: 7.2 }).ok,
    ).toBe(true);
    // Doublage : l'épaisseur comprend l'isolant, pas de contrôle.
    expect(
      parseChatCall("cloison", { longueurs_m: [4.2], hauteur_m: 2.7, faces: 1, epaisseur_cm: 14 })
        .ok,
    ).toBe(true);
  });

  it("refuse les entrées incohérentes au lieu de deviner", () => {
    expect(parseChatCall("cloison", { longueurs_m: [], hauteur_m: 2.5 }).ok).toBe(false);
    expect(parseChatCall("cloison", { longueurs_m: [3], hauteur_m: 25 }).ok).toBe(false);
    expect(parseChatCall("peinture", { pieces: [], plafonds: true, couches: 2 }).ok).toBe(false);
    expect(parseChatCall("inconnu", {}).ok).toBe(false);
    expect(parseChatCall("calculer", { expression: 3 }).ok).toBe(false);
  });

  it("question de précision : 4 choix au plus", () => {
    expect(
      parseChatCall("demander_precision", {
        question: "Simple ou double peau ?",
        choix: ["Simple", "Double"],
      }),
    ).toEqual({
      ok: true,
      call: {
        tool: "demander_precision",
        question: "Simple ou double peau ?",
        choices: ["Simple", "Double"],
      },
    });
    expect(
      parseChatCall("demander_precision", { question: "?", choix: ["a", "b", "c", "d", "e"] }).ok,
    ).toBe(false);
  });
});

describe("résultats pour le modèle et réponse enregistrée", () => {
  it("met le calcul de cloison en m, m² et unités, avec ses étapes et sa source", () => {
    const out = partitionForModel(
      partitionTakeoff({ runsMm: [7580, 7580, 3000, 3620], heightMm: 2500 }),
    );
    expect(out).toMatchObject({
      longueur_ml: 21.78,
      surface_cloison_m2: 54.45,
      plaques: 39,
      rails: 15,
      montants: 42,
      longueur_montant_m: 2.5,
      vis: 1198,
      bande_ml: 152.46,
      enduit_kg: 32.67,
      conditionnements: { boites_de_vis: 2, rouleaux_de_bande: 2, sacs_d_enduit: 2 },
    });
    expect(out.source).toContain("Placo");
    expect(out.etapes[1]).toMatch(/^Plaques : /);
  });

  it("réponse finale : texte, métré et fournitures, nombres positifs seulement", () => {
    expect(
      chatAnswerFromTool(
        {
          reponse: "Il vous faut 39 plaques.",
          titre: "Cloisons 72/48",
          lignes: [{ libelle: "Cloison A", quantite: 7.58, unite: "ml", piece: "Chambre 1" }],
          fournitures: [
            { libelle: "Plaques BA13", quantite: 39, unite: "u", prix_unitaire_centimes: 790 },
          ],
        },
        ["Plaques : 39"],
      ),
    ).toEqual({
      ok: true,
      answer: "Il vous faut 39 plaques.",
      result: {
        titre: "Cloisons 72/48",
        lignes: [
          { libelle: "Cloison A", quantite: 7.58, unite: "ml", detail: null, piece: "Chambre 1" },
        ],
        fournitures: [
          {
            libelle: "Plaques BA13",
            quantite: 39,
            unite: "u",
            prix_unitaire_centimes: 790,
            total_centimes: 30_810,
          },
        ],
        total_centimes: 30_810,
        etapes: ["Plaques : 39"],
      },
    });
    expect(chatAnswerFromTool({ reponse: "", titre: "x", lignes: [] }, []).ok).toBe(false);
  });
});
