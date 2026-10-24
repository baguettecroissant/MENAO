import { describe, expect, it } from "vitest";
import {
  appendIdea,
  needSuggestionJsonSchema,
  normalizeNeedSuggestion,
  remainingCompletion,
  type RawNeedSuggestion,
} from "../src/need-suggestion";

const text = "Je veux refaire ma salle de bain";
const nothing: Pick<RawNeedSuggestion, "compris" | "question"> = {
  compris: { metier: null, piece: null, ville: null, surface: null, delai: null },
  question: null,
};

describe("suggestions pendant la saisie (ADR 0177)", () => {
  it("schéma : reprise, idées, compréhension et question obligatoires, rien d'autre", () => {
    const schema = needSuggestionJsonSchema();
    expect(schema.required).toEqual(["reprise", "idees", "compris", "question"]);
    expect(schema.additionalProperties).toBe(false);
    expect(schema.properties.idees.items.additionalProperties).toBe(false);
  });

  const completion = (reprise: string | null, typed = text) =>
    normalizeNeedSuggestion({ ...nothing, reprise, idees: [] }, typed).completion;

  it("suite : la reprise des derniers mots est retirée, espace compris", () => {
    expect(completion("ma salle de bain en remplaçant la baignoire")).toBe(
      " en remplaçant la baignoire",
    );
    expect(completion("Salle De Bain  en remplaçant   la baignoire ")).toBe(
      " en remplaçant la baignoire",
    );
    expect(completion("mon salon, murs et plafond", "Peindre mon salon")).toBe(", murs et plafond");
  });

  it("dernier mot coupé : la suite le termine, collée au texte", () => {
    expect(completion("de la cuisine, ça goutte", "Fuite sous l'évier de la cuis")).toBe(
      "ine, ça goutte",
    );
    expect(completion("sous l'évier de la cuisine", "Fuite sous l'év")).toBe("ier de la cuisine");
  });

  it("texte terminé par une espace : suite sans espace au début", () => {
    expect(completion("salle de bain avec une douche", `${text} `)).toBe("avec une douche");
  });

  it("reprise qui ne recopie pas la fin du texte : pas de suite", () => {
    expect(completion("en remplaçant la baignoire")).toBeNull();
    expect(completion("ain en remplaçant la baignoire")).toBeNull();
  });

  it("suite écartée : chiffre, « … », détail personnel, « null », répétition, longue ou vide", () => {
    expect(completion("salle de bain de 6 m²")).toBeNull();
    expect(completion("salle de bain d'environ … mètres")).toBeNull();
    expect(completion("salle de bain pour mon fils")).toBeNull();
    expect(completion("null")).toBeNull();
    expect(completion("salle de bain")).toBeNull();
    expect(completion(`salle de bain ${"très ".repeat(20)}`)).toBeNull();
    expect(completion("   ")).toBeNull();
    expect(completion(null)).toBeNull();
  });

  it("suite coupée ou qui répète le texte : écartée ; ponctuation finale retirée", () => {
    expect(completion("salle de bain en remplaçant la baignoire, avec")).toBeNull();
    expect(completion("salle de bain, il faut refaire ma salle de bain")).toBeNull();
    expect(completion("salle de bain en remplaçant la baignoire, ")).toBe(
      " en remplaçant la baignoire",
    );
  });

  it("idées : 4 au plus, distinctes, sans « + », un seul endroit à compléter", () => {
    const { ideas } = normalizeNeedSuggestion(
      {
        ...nothing,
        reprise: null,
        idees: [
          { libelle: "+ surface", texte: ", d'environ ... m²" },
          { libelle: "Surface", texte: ", de … m²" },
          { libelle: "Ville", texte: "à … ou …" },
          { libelle: "Délai", texte: ", idéalement d'ici …" },
          { libelle: "Carrelage", texte: "avec un nouveau carrelage" },
          { libelle: "Meuble vasque", texte: "et un meuble vasque" },
        ],
      },
      text,
    );
    expect(ideas).toEqual([
      { label: "Surface", insert: ", d'environ … m²" },
      { label: "Ville", insert: "à … ou" },
      { label: "Délai", insert: ", idéalement d'ici …" },
      { label: "Carrelage", insert: "avec un nouveau carrelage" },
    ]);
  });

  it("idée de surface écartée quand le texte en donne une", () => {
    const ideas = (typed: string) =>
      normalizeNeedSuggestion(
        {
          ...nothing,
          reprise: null,
          idees: [
            { libelle: "Surface", texte: ", d'environ … m²" },
            { libelle: "Délai", texte: ", idéalement d'ici …" },
          ],
        },
        typed,
      ).ideas.map((idea) => idea.label);
    expect(ideas("Poser une véranda de 15 m² à Montpellier")).toEqual(["Délai"]);
    expect(ideas("Poser une véranda à Montpellier")).toEqual(["Surface", "Délai"]);
  });

  it("idée de ville écartée quand le texte en donne une", () => {
    const ideas = (typed: string) =>
      normalizeNeedSuggestion(
        {
          ...nothing,
          reprise: null,
          idees: [
            { libelle: "Ville", texte: "à …" },
            { libelle: "Délai", texte: ", idéalement d'ici …" },
          ],
        },
        typed,
      ).ideas.map((idea) => idea.label);
    expect(ideas("Rénover un appartement à Nice")).toEqual(["Délai"]);
    expect(ideas("Rénover un appartement à refaire")).toEqual(["Ville", "Délai"]);
  });

  it("idées écartées : déjà écrites, chiffre inventé, trop longues ou vides", () => {
    const { ideas } = normalizeNeedSuggestion(
      {
        ...nothing,
        reprise: null,
        idees: [
          { libelle: "Pièce", texte: "salle de bain" },
          { libelle: "Vasques", texte: "avec 2 vasques" },
          { libelle: "Détails", texte: "x".repeat(90) },
          { libelle: "", texte: "à …" },
          { libelle: "Vide", texte: "  " },
        ],
      },
      text,
    );
    expect(ideas).toEqual([]);
  });

  it("suite encore valable quand le particulier en tape le début", () => {
    const completion = " en remplaçant la baignoire";
    expect(remainingCompletion(text, completion, text)).toBe(completion);
    expect(remainingCompletion(text, completion, `${text} en rem`)).toBe("plaçant la baignoire");
    expect(remainingCompletion(text, completion, `${text} En rem`)).toBe("plaçant la baignoire");
    expect(remainingCompletion(text, completion, `${text} avec`)).toBeNull();
    expect(remainingCompletion(text, completion, `${text}${completion}`)).toBeNull();
    expect(remainingCompletion(text, completion, "Je veux refaire")).toBeNull();
    expect(remainingCompletion(text, null, text)).toBeNull();
  });

  it("idée ajoutée à la fin, endroit à compléter sélectionné", () => {
    expect(appendIdea(`${text} `, ", d'environ … m²")).toEqual({
      text: `${text}, d'environ … m²`,
      select: [text.length + 12, text.length + 13],
    });
    expect(appendIdea(text, "avec un nouveau carrelage")).toEqual({
      text: `${text} avec un nouveau carrelage`,
      select: null,
    });
    expect(appendIdea("", "à …").text).toBe("À …");
  });

  describe("compréhension en direct (ADR 0179)", () => {
    const trades = ["plombier", "electricien"];
    const understand = (
      compris: Partial<(typeof nothing)["compris"]>,
      typed = "Refaire ma salle de bain de 8 m² à Nice",
    ) =>
      normalizeNeedSuggestion(
        { ...nothing, reprise: null, idees: [], compris: { ...nothing.compris, ...compris } },
        typed,
        trades,
      ).understood;

    it("métier de la liste, pièce, ville et surface écrites, délai", () => {
      expect(
        understand({
          metier: "plombier",
          piece: "salle de bain",
          ville: "nice",
          surface: "8 m²",
          delai: "urgent",
        }),
      ).toEqual({
        trade: "plombier",
        room: "Salle de bain",
        city: "Nice",
        surface: "8 m²",
        timing: "Urgent",
      });
    });

    it("métier écrit avec son nom plutôt que son code : reconnu", () => {
      expect(understand({ metier: "Électricien" }).trade).toBe("electricien");
    });

    it("rien de deviné : métier hors liste, ville ou surface absentes du texte", () => {
      expect(
        understand(
          { metier: "astronaute", ville: "Lyon", surface: "12 m²" },
          "Refaire ma salle de bain",
        ),
      ).toEqual({ trade: null, room: null, city: null, surface: null, timing: null });
    });

    const ask = (
      question:
        | (typeof nothing)["question"]
        | { intitule: string; reponses: { libelle: string; texte: string }[] },
      typed = "Je veux refaire ma salle de bain",
      compris: Partial<(typeof nothing)["compris"]> = {},
    ) =>
      normalizeNeedSuggestion(
        {
          ...nothing,
          reprise: null,
          idees: [],
          compris: { ...nothing.compris, ...compris },
          question,
        },
        typed,
        trades,
      ).question;

    const surface = {
      intitule: "Quelle surface environ",
      reponses: [
        { libelle: "moins de 5 m²", texte: ", d'environ moins de 5 m²" },
        { libelle: "5 à 10 m²", texte: ", d'environ 5 à 10 m²" },
        { libelle: "5 à 10 m²", texte: ", d'environ 5 à 10 m²" },
        { libelle: "Plus de 10 m²", texte: ", de plus de 10 m²" },
      ],
    };

    it("question : point d'interrogation ajouté, réponses distinctes", () => {
      expect(ask(surface)).toEqual({
        label: "Quelle surface environ ?",
        answers: [
          { label: "Moins de 5 m²", insert: ", d'environ moins de 5 m²" },
          { label: "5 à 10 m²", insert: ", d'environ 5 à 10 m²" },
          { label: "Plus de 10 m²", insert: ", de plus de 10 m²" },
        ],
      });
    });

    it("question écartée : déjà répondue, sur la ville, endroit à compléter, trop peu de réponses", () => {
      expect(ask(surface, "Refaire ma salle de bain de 8 m²")).toBeNull();
      expect(
        ask(
          {
            intitule: "Pour quand ?",
            reponses: [
              { libelle: "Urgent", texte: ", en urgence" },
              { libelle: "Ce mois-ci", texte: ", dans le mois" },
            ],
          },
          "Refaire ma salle de bain",
          { delai: "d'ici fin novembre" },
        ),
      ).toBeNull();
      expect(
        ask({
          intitule: "Dans quelle ville ?",
          reponses: [
            { libelle: "Nice", texte: "à Nice" },
            { libelle: "Autre", texte: "à …" },
          ],
        }),
      ).toBeNull();
      expect(
        ask({
          intitule: "Quel délai ?",
          reponses: [
            { libelle: "Date précise", texte: ", pour le …" },
            { libelle: "Urgent", texte: ", en urgence" },
          ],
        }),
      ).toBeNull();
    });

    it("les idées ne reprennent pas le sujet de la question", () => {
      const ideas = normalizeNeedSuggestion(
        {
          ...nothing,
          reprise: null,
          question: surface,
          idees: [
            { libelle: "Surface", texte: ", d'environ … m²" },
            { libelle: "Carrelage", texte: "avec un nouveau carrelage" },
          ],
        },
        "Je veux refaire ma salle de bain",
        trades,
      ).ideas;
      expect(ideas.map((idea) => idea.label)).toEqual(["Carrelage"]);
    });
  });
});
