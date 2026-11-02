import {
  type ConnectAddress,
  type ConnectDetails,
  birthDateOf,
  homeAddressOf,
  normalizeIban,
} from "@menao/core";
import { z } from "zod";
import { messages } from "./messages";

/**
 * Compléments saisis dans MENAO juste avant Stripe (ADR 0215) : date de naissance et adresse
 * personnelle de l'entrepreneur ou du dirigeant (`personal`), associé unique, IBAN. Contrôlés dans
 * le navigateur ou l'application ; ils partent ensuite directement chez Stripe dans les jetons,
 * jamais vers MENAO. Une adresse d'outre-mer est acceptée mais saisie chez Stripe (pays différent).
 */
export function connectDetailsSchema(options: {
  personal: boolean;
  /** Date du jour (AAAA-MM-JJ, heure de Paris), pour l'âge. */
  today: string;
  /** Adresse de l'établissement, proposée comme adresse personnelle. */
  businessAddress: ConnectAddress | null;
}) {
  const text = z.string().trim().default("");
  return z
    .object({
      birthDate: text,
      sameAddress: z.boolean().default(false),
      line1: text,
      postalCode: text,
      city: text,
      iban: text,
      soleOwner: z.boolean().default(false),
    })
    .transform((v, ctx): ConnectDetails => {
      const fail = (path: string, message: string) =>
        ctx.addIssue({ code: "custom", path: [path], message });
      const iban = normalizeIban(v.iban);
      if (!v.iban) fail("iban", messages.required);
      else if (!iban) fail("iban", messages.ibanInvalid);
      if (!options.personal) return { iban };

      const birthDate = birthDateOf(v.birthDate, options.today);
      if (!birthDate)
        fail("birthDate", v.birthDate ? messages.birthDateInvalid : messages.required);
      let homeAddress: ConnectAddress | null = null;
      if (v.sameAddress && options.businessAddress) {
        homeAddress = options.businessAddress;
      } else {
        if (!v.line1) fail("line1", messages.required);
        if (!/^\d{5}$/.test(v.postalCode)) fail("postalCode", messages.postalCodeInvalid);
        if (!v.city) fail("city", messages.required);
        homeAddress = homeAddressOf(v);
      }
      return { birthDate, homeAddress, iban, soleOwner: v.soleOwner };
    });
}
export type ConnectDetailsInput = z.input<ReturnType<typeof connectDetailsSchema>>;
