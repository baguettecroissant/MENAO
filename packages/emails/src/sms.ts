/**
 * SMS des rappels au client (F-88, ADR 0239), au nom de l'entreprise de l'artisan : un seul SMS
 * de 160 caractères (alphabet GSM 7 bits, sans lequel le message passerait en Unicode, 70
 * caractères), sans mention « STOP » (elle ferait passer le SMS en marketing chez Brevo).
 * Fichier sans dépendance : chargé aussi par Deno (fonction notify).
 */

export const SMS_MAX_LENGTH = 160;

/** Caractères de l'alphabet GSM 7 bits de base. */
const GSM_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
/** Caractères de l'extension GSM : deux positions chacun. */
const GSM_EXTENDED = "^{}\\[~]|€";

const REPLACEMENTS: Record<string, string> = {
  "«": '"',
  "»": '"',
  "“": '"',
  "”": '"',
  "’": "'",
  "‘": "'",
  "–": "-",
  "—": "-",
  "…": "...",
  " ": " ",
  " ": " ",
  â: "a",
  ê: "e",
  î: "i",
  ô: "o",
  û: "u",
  ë: "e",
  ï: "i",
  ÿ: "y",
  ç: "c",
  À: "A",
  Â: "A",
  È: "E",
  Ê: "E",
  Ë: "E",
  Î: "I",
  Ï: "I",
  Ô: "O",
  Ù: "U",
  Û: "U",
  œ: "oe",
  Œ: "OE",
};

/** Texte ramené à l'alphabet GSM : accents absents remplacés, autres caractères retirés. */
export function gsmSafe(text: string): string {
  let out = "";
  for (const char of text) {
    const replaced = REPLACEMENTS[char] ?? char;
    for (const c of replaced) {
      if (GSM_BASIC.includes(c) || GSM_EXTENDED.includes(c)) out += c;
    }
  }
  return out.replace(/ {2,}/g, " ").trim();
}

/** Longueur en positions GSM (les caractères de l'extension en comptent deux). */
export function gsmLength(text: string): number {
  let length = 0;
  for (const c of text) length += GSM_EXTENDED.includes(c) ? 2 : 1;
  return length;
}

const PARIS = "Europe/Paris";

function moment(value: unknown): { day: string; time: string } | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const day = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: PARIS,
  }).format(date);
  const time = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: PARIS,
  })
    .format(date)
    .replace(":", "h");
  return { day, time };
}

function str(data: Record<string, unknown>, key: string): string | null {
  const value = data[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function euros(cents: unknown): string | null {
  if (typeof cents !== "number" || !Number.isInteger(cents) || cents <= 0) return null;
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

/**
 * Texte du SMS d'un rappel, ou null si le type n'a pas de SMS. Le titre du chantier est raccourci
 * pour tenir en un SMS ; `site` : adresse courte du site (« menao.fr »).
 */
export function smsContent(
  type: string,
  data: Record<string, unknown>,
  site: string,
): string | null {
  const company = gsmSafe(str(data, "entreprise") ?? "Votre artisan").slice(0, 40);
  const space = `${site}/mon-espace`;
  const build = (title: string): string | null => {
    const t = `"${title}"`;
    switch (type) {
      case "rdv_rappel": {
        const at = moment(data.rendez_vous);
        return `${company} (via MENAO) : rappel de votre rendez-vous demain${at ? ` à ${at.time}` : ""} pour ${t}. Détails sur ${space}`;
      }
      case "demarrage_rappel":
        return `${company} (via MENAO) : votre chantier ${t} démarre demain. Suivez-le sur ${space}`;
      case "acompte_relance":
      case "paiement_relance": {
        const solde = data.tranche === "solde";
        const amount = euros(data.montant);
        return `${company} (via MENAO) : ${solde ? "le solde" : "l'acompte"}${amount ? ` de ${amount}` : ""} pour ${t} reste à régler. Paiement en ligne : ${space}`;
      }
      case "avis_relance":
        return `${company} (via MENAO) : votre avis compte ! Notez votre chantier ${t} sur ${space}. Merci !`;
      default:
        return null;
    }
  };
  const title = gsmSafe(str(data, "titre") ?? "votre projet");
  const full = build(title);
  if (full === null) return null;
  let text = gsmSafe(full);
  if (gsmLength(text) <= SMS_MAX_LENGTH) return text;
  // Titre raccourci jusqu'à tenir en un SMS.
  const overflow = gsmLength(text) - SMS_MAX_LENGTH;
  const shortTitle = `${title.slice(0, Math.max(0, title.length - overflow - 3)).trimEnd()}...`;
  text = gsmSafe(build(shortTitle) ?? "");
  return gsmLength(text) <= SMS_MAX_LENGTH ? text : text.slice(0, SMS_MAX_LENGTH);
}
