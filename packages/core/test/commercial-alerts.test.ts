import { describe, expect, it } from "vitest";
import {
  commercialPushPrefs,
  alertDaysLeft,
  relanceMessage,
  sortCommercialAlerts,
  trialEndMessage,
  vapidKeyBytes,
  wholeDaysBetween,
} from "../src/commercial-alerts";

describe("préférences des notifications sur le téléphone", () => {
  it("tout est activé par défaut, un refus explicite coupe le type", () => {
    expect(commercialPushPrefs({})).toEqual({
      conseiller_prime: true,
      conseiller_relance: true,
      conseiller_fin_essai: true,
      conseiller_lien: true,
    });
    expect(commercialPushPrefs({ push: { conseiller_lien: false } }).conseiller_lien).toBe(false);
    expect(commercialPushPrefs(null).conseiller_prime).toBe(true);
  });
});

describe("ordre des artisans à relancer", () => {
  it("fin d'essai, puis bloqués, puis liens ; la date la plus proche d'abord", () => {
    const sorted = sortCommercialAlerts([
      { kind: "lien", at: "2027-01-10" },
      { kind: "bloque", at: "2027-01-11" },
      { kind: "fin_essai", at: "2027-01-21" },
      { kind: "bloque", at: "2027-01-09" },
    ]);
    expect(sorted.map((a) => `${a.kind}:${a.at}`)).toEqual([
      "fin_essai:2027-01-21",
      "bloque:2027-01-09",
      "bloque:2027-01-11",
      "lien:2027-01-10",
    ]);
  });
});

describe("jours", () => {
  const now = new Date("2027-01-14T10:00:00Z");
  it("depuis et jusqu'à, jamais négatifs", () => {
    expect(wholeDaysBetween("2027-01-11T09:00:00Z", now)).toBe(3);
    expect(alertDaysLeft("2027-01-21T09:00:00Z", now)).toBe(7);
    expect(alertDaysLeft("2027-01-13T09:00:00Z", now)).toBe(0);
  });
});

describe("messages prêts", () => {
  it("relance selon la première étape qui manque", () => {
    expect(
      relanceMessage({ steps: ["decennale"], artisanFirstName: "Marc", advisor: "Sarah" }),
    ).toBe(
      "Bonjour Marc, c'est Sarah, de MENAO. Votre dossier avance : il ne vous reste qu'à déposer votre attestation de décennale. Tout se fait depuis votre espace, rubrique « Mon dossier ». Je reste disponible si besoin.",
    );
    expect(
      relanceMessage({
        steps: ["charte", "documents", "inconnue"],
        artisanFirstName: null,
        advisor: "Sarah",
      }),
    ).toContain("il vous reste à signer la charte qualité, puis 1 autre étape");
    expect(relanceMessage({ steps: [], artisanFirstName: null, advisor: "Sarah" })).toContain(
      "il reste peu de choses",
    );
  });
  it("fin d'essai, sans promesse", () => {
    expect(trialEndMessage({ artisanFirstName: "Marc", advisor: "Sarah", days: 7 })).toContain(
      "Votre essai se termine dans 7 jours",
    );
    expect(trialEndMessage({ artisanFirstName: null, advisor: "Sarah", days: 1 })).toContain(
      "se termine demain",
    );
  });
});

describe("clé VAPID", () => {
  it("décode le base64url sans remplissage", () => {
    expect([...vapidKeyBytes("AQID_w")]).toEqual([1, 2, 3, 255]);
  });
});
