import { describe, expect, it } from "vitest";
import { detectUrgency, resolveUrgency } from "../src/urgency";

describe("urgence repérée dans la description (ADR 0279)", () => {
  it.each([
    ["Je cherche un plombier sur Antibes car j'ai une fuite au plafond !", "fuite", "fuite"],
    ["Dégât des eaux dans la cuisine depuis ce matin", "fuite", "Dégât des eaux"],
    [
      "Plus de chauffage depuis hier soir, la chaudière affiche une erreur",
      "chauffage",
      "Plus de chauffage",
    ],
    ["Mon chauffe-eau est en panne", "chauffage", "chauffe-eau est en panne"],
    ["Plus d'eau chaude à la maison", "chauffage", "Plus d'eau chaude"],
    ["Coupure de courant dans tout l'appartement", "electricite", "Coupure de courant"],
    ["Il y a un court-circuit dans le tableau", "electricite", "court-circuit"],
    ["Je suis enfermé dehors, la porte a claqué", "serrure", "enfermé dehors"],
    ["Ma serrure est cassée après un cambriolage", "serrure", "cambriolage"],
    ["La vitre cassée du salon doit être remplacée", "vitre", "vitre cassée"],
    ["WC bouché et ça déborde", "canalisation", "WC bouché"],
    ["Le toit fuit depuis l'orage", "fuite", "fuit"],
    ["Besoin d'un électricien en urgence à Nice", "exprimee", "en urgence"],
    ["Remplacer un radiateur au plus vite", "exprimee", "au plus vite"],
  ])("« %s » : %s", (text, reason, excerpt) => {
    expect(detectUrgency(text)).toEqual({ reason, excerpt });
  });

  it.each([
    "Je souhaite refaire ma salle de bain de 8 m² à Nice",
    "Remplacer le ballon d'eau chaude de mon appartement à Nice",
    "Peindre le salon et poser du parquet le mois prochain",
    "Installer une climatisation réversible avant l'été",
    "Changer une serrure pour plus de sécurité",
    "Faire vérifier la toiture pour éviter une fuite cet hiver",
    "",
  ])("« %s » : pas d'urgence", (text) => {
    expect(detectUrgency(text)).toBeNull();
  });

  it("l'extrait reprend les mots du particulier, avec leurs accents", () => {
    expect(detectUrgency("  La CHAUDIÈRE ne démarre plus  ")?.excerpt).toBe("CHAUDIÈRE ne démarre");
  });
});

describe("urgence retenue", () => {
  it("le choix du particulier passe avant ce qui est repéré", () => {
    expect(resolveUrgency("auto", true)).toBe(true);
    expect(resolveUrgency("auto", false)).toBe(false);
    expect(resolveUrgency("oui", false)).toBe(true);
    expect(resolveUrgency("non", true)).toBe(false);
  });
});
