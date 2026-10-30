import { describe, expect, it } from "vitest";
import {
  ACCOUNT_DELETION_MESSAGE_MAX_LENGTH,
  accountDeletionSchema,
  accountProfileSchema,
  emailChangeSchema,
  passwordChangeSchema,
} from "../src/account";
import { messages } from "../src/messages";

// Données fictives uniquement : domaine réservé .test, numéros de la tranche fiction ARCEP (06 39 98).
const issues = (result: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) => Object.fromEntries((result.error?.issues ?? []).map((i) => [i.path.join("."), i.message]));

describe("Mon compte (F-08)", () => {
  it("informations : nom et prénom nettoyés, téléphone normalisé ou facultatif", () => {
    expect(
      accountProfileSchema.parse({
        firstName: " Camille ",
        lastName: "Exemple",
        phone: "06 39 98 00 01",
      }),
    ).toEqual({ firstName: "Camille", lastName: "Exemple", phone: "+33639980001" });
    expect(
      accountProfileSchema.parse({ firstName: "Camille", lastName: "Exemple", phone: "" }),
    ).toEqual({
      firstName: "Camille",
      lastName: "Exemple",
      phone: undefined,
    });
    expect(
      issues(accountProfileSchema.safeParse({ firstName: " ", lastName: "Exemple", phone: "12" })),
    ).toEqual({ firstName: messages.required, phone: messages.phoneInvalid });
  });

  it("nouvelle adresse e-mail : nettoyée et vérifiée", () => {
    expect(emailChangeSchema.parse({ email: " Camille@Example.TEST " })).toEqual({
      email: "camille@example.test",
    });
    expect(issues(emailChangeSchema.safeParse({ email: "camille@" }))).toEqual({
      email: messages.emailInvalid,
    });
  });

  it("mot de passe : l'actuel est requis, le nouveau fait 8 caractères et diffère", () => {
    expect(
      passwordChangeSchema.parse({
        currentPassword: "ancien-mot-de-passe",
        password: "nouveau-mot-de-passe",
      }),
    ).toEqual({ currentPassword: "ancien-mot-de-passe", password: "nouveau-mot-de-passe" });
    expect(
      issues(passwordChangeSchema.safeParse({ currentPassword: "", password: "court" })),
    ).toEqual({
      currentPassword: messages.required,
      password: messages.passwordTooShort,
    });
    expect(
      issues(
        passwordChangeSchema.safeParse({
          currentPassword: "meme-mot-de-passe",
          password: "meme-mot-de-passe",
        }),
      ),
    ).toEqual({ password: messages.passwordUnchanged });
  });

  it("suppression du compte : confirmation obligatoire, message facultatif et limité", () => {
    expect(
      accountDeletionSchema.parse({ confirm: true, message: "  Plus de travaux prévus. " }),
    ).toEqual({
      confirm: true,
      message: "Plus de travaux prévus.",
    });
    expect(accountDeletionSchema.parse({ confirm: true, message: " " })).toEqual({
      confirm: true,
      message: undefined,
    });
    expect(issues(accountDeletionSchema.safeParse({ confirm: false }))).toEqual({
      confirm: messages.deletionConfirmRequired,
    });
    expect(
      issues(
        accountDeletionSchema.safeParse({
          confirm: true,
          message: "a".repeat(ACCOUNT_DELETION_MESSAGE_MAX_LENGTH + 1),
        }),
      ),
    ).toEqual({ message: messages.tooLong });
  });
});
