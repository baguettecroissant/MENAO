import { describe, expect, it } from "vitest";
import { emailPreferences, notificationCategory } from "../src/notifications";

describe("préférences de notification (F-41)", () => {
  it("catégories : activité, rappels, sinon transactionnelle", () => {
    expect(notificationCategory("chantier_nouveautes")).toBe("activite");
    expect(notificationCategory("nouveaux_messages")).toBe("activite");
    expect(notificationCategory("rdv_rappel")).toBe("rappels");
    expect(notificationCategory("avis_relance")).toBe("rappels");
    expect(notificationCategory("acompte_relance")).toBe("rappels");
    expect(notificationCategory("planning_relance")).toBe("rappels");
    expect(notificationCategory("levee_relance")).toBe("rappels");
    for (const type of ["devis_recu", "acompte_paye", "pv_signe", "litige_ouvert", "avis_recu"]) {
      expect(notificationCategory(type)).toBe("transactionnel");
    }
  });

  it("préférences lues dans le profil, tout activé par défaut", () => {
    expect(emailPreferences({})).toEqual({ activite: true, rappels: true });
    expect(emailPreferences(null)).toEqual({ activite: true, rappels: true });
    expect(emailPreferences({ email: { activite: false } })).toEqual({
      activite: false,
      rappels: true,
    });
    expect(emailPreferences({ email: { activite: "non", rappels: false } })).toEqual({
      activite: true,
      rappels: false,
    });
  });
});
