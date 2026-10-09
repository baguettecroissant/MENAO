/**
 * Identifiants d'entreprise français (SIRET, SIREN, TVA intracommunautaire).
 * Fichier autonome (aucun import) : il est aussi importé par les Edge Functions (Deno).
 */

const LA_POSTE_SIREN = "356000000";

export function normalizeSiret(input: string): string {
  return input.replace(/[\s.-]/g, "");
}

function luhnValid(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

/**
 * SIRET valide : 14 chiffres et clé de Luhn. Exception INSEE : les établissements de
 * La Poste (hors siège, qui suit Luhn) ont une somme de chiffres multiple de 5.
 */
export function isValidSiret(siret: string): boolean {
  if (!/^\d{14}$/.test(siret)) return false;
  if (luhnValid(siret)) return true;
  if (!siret.startsWith(LA_POSTE_SIREN)) return false;
  const sum = [...siret].reduce((acc, c) => acc + Number(c), 0);
  return sum % 5 === 0;
}

export function sirenFromSiret(siret: string): string {
  return siret.slice(0, 9);
}

/** Numéro de TVA intracommunautaire français déduit du SIREN : FR + clé + SIREN. */
export function frenchVatNumber(siren: string): string {
  const key = (12 + 3 * (Number(siren) % 97)) % 97;
  return `FR${String(key).padStart(2, "0")}${siren}`;
}
