import { describe, expect, it } from "vitest";
import { accountantSettingsSchema } from "../src/accountant";

const settings = {
  enabled: true,
  email: "  Cabinet@Exemple.test ",
  period: "mensuel",
  includeInvoices: true,
  includeExpenses: false,
};

describe("réglages de l'envoi au comptable", () => {
  it("adresse nettoyée, en minuscules", () => {
    expect(accountantSettingsSchema.parse(settings).email).toBe("cabinet@exemple.test");
  });

  it("adresse invalide, rythme inconnu ou aucune partie : refusés", () => {
    expect(accountantSettingsSchema.safeParse({ ...settings, email: "cabinet" }).success).toBe(
      false,
    );
    expect(accountantSettingsSchema.safeParse({ ...settings, period: "annuel" }).success).toBe(
      false,
    );
    const none = accountantSettingsSchema.safeParse({ ...settings, includeInvoices: false });
    expect(none.error?.issues[0]?.path).toEqual(["includeExpenses"]);
  });
});
