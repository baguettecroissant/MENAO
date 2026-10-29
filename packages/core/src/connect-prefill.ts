/**
 * Pré-remplissage du compte Stripe Connect de l'artisan (F-14 étape 6, ADR 0204) : ce que MENAO
 * sait déjà (Sirene, profil, métiers) est transmis à Stripe à la création du compte, avant le
 * premier lien d'inscription ; l'artisan ne fait plus que relire et compléter (date de naissance,
 * adresse personnelle, IBAN, conditions de Stripe).
 * - Identité de l'entreprise et du dirigeant : par jetons Stripe créés depuis le navigateur ou
 *   l'application avec la clé publique (exigence de Stripe pour une plateforme française).
 * - Profil public et libellé des relevés bancaires : envoyés par le serveur, sans jeton.
 * Après le premier lien, Stripe n'accepte plus de modification de l'identité : seuls les comptes
 * créés à partir de maintenant sont pré-remplis.
 * Fichier autonome (aucun import) : importé par l'Edge Function connect-onboarding.
 */

/** Données de MENAO utilisables pour le pré-remplissage ; toutes peuvent manquer. */
export type ConnectPrefillSource = {
  /** Catégorie juridique INSEE (4 chiffres). */
  formeJuridiqueCode: string | null;
  raisonSociale: string | null;
  nomCommercial: string | null;
  siren: string | null;
  tvaIntracom: string | null;
  /** Adresse de l'établissement (Sirene). */
  adresseLigne: string | null;
  adresseCodePostal: string | null;
  adresseCommune: string | null;
  /** L'utilisateur a déclaré à l'inscription être le dirigeant de l'entreprise. */
  isDirigeant: boolean | null;
  firstName: string | null;
  lastName: string | null;
  /** Téléphone du profil (E.164). */
  phone: string | null;
  email: string | null;
  /** Libellés des métiers, dans l'ordre d'affichage. */
  trades: readonly string[];
};

type Address = { line1: string; postal_code: string; city: string; country: "FR" };

/** Contenu du jeton « account » : identité de la société ou de l'entrepreneur individuel. */
export type ConnectAccountTokenData =
  | {
      business_type: "company";
      company: {
        name?: string;
        tax_id?: string;
        vat_id?: string;
        phone?: string;
        address?: Address;
      };
    }
  | {
      business_type: "individual";
      individual: { first_name: string; last_name: string; email?: string; phone?: string };
    };

/** Contenu du jeton « person » : le dirigeant, représentant légal de la société. */
export type ConnectPersonTokenData = {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  relationship: { representative: true };
};

/** Complément du profil public et libellé des relevés, envoyés par le serveur (sans jeton). */
export type ConnectProfileParams = {
  business_profile: {
    product_description: string;
    support_phone?: string;
    support_email?: string;
  };
  settings?: { payments: { statement_descriptor: string } };
};

export type ConnectPrefill = {
  /** Nom affiché aux clients : nom commercial, sinon raison sociale. */
  name: string | null;
  profile: ConnectProfileParams;
  account: ConnectAccountTokenData | null;
  person: ConnectPersonTokenData | null;
};

/** Texte nettoyé (espaces) et borné ; null s'il est vide. */
function clean(value: string | null | undefined, max: number): string | null {
  const text = (value ?? "").replace(/\s+/g, " ").trim().slice(0, max).trim();
  return text || null;
}

const E164 = /^\+[1-9]\d{7,14}$/;
const phoneOf = (value: string | null) => (value && E164.test(value) ? value : undefined);
const emailOf = (value: string | null) => {
  const text = clean(value, 800);
  return text && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ? text : undefined;
};

/**
 * Type d'entreprise attendu par Stripe d'après la catégorie juridique INSEE : entrepreneur
 * individuel (1000, micro-entrepreneur compris) ou société (5xxx commerciales, 6xxx civiles et
 * autres personnes morales de droit privé). Sinon null : l'artisan choisit lui-même chez Stripe.
 */
export function connectBusinessType(code: string | null): "company" | "individual" | null {
  if (code === "1000") return "individual";
  return code && /^[56]\d{3}$/.test(code) ? "company" : null;
}

/**
 * Libellé sur les relevés bancaires des clients (règles Stripe) : 5 à 22 caractères latins, au
 * moins une lettre, sans < > \ ' " *. Accents retirés, majuscules. Sinon null : Stripe le demande.
 */
export function statementDescriptor(name: string | null): string | null {
  const ascii = (name ?? "")
    .replace(/[Œœ]/g, "OE")
    .replace(/[Ææ]/g, "AE")
    .replace(/ß/g, "SS")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 .,-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const text = ascii.slice(0, 22).trim();
  return text.length >= 5 && /[A-Z]/.test(text) ? text : null;
}

/** Description de l'activité (au moins 10 caractères, exigence de Stripe sans site web). */
export function productDescription(trades: readonly string[]): string {
  const list = [...new Set(trades.map((t) => t.trim()).filter(Boolean))].slice(0, 6);
  const head = list.length
    ? `${list.join(", ")} : travaux du bâtiment pour particuliers`
    : "Travaux du bâtiment pour particuliers";
  return `${head}. Devis signés en ligne, acompte et solde réglés en ligne.`;
}

/** Adresse de l'établissement, si elle est complète et en France métropolitaine. */
function addressOf(source: ConnectPrefillSource): Address | undefined {
  const line1 = clean(source.adresseLigne, 200);
  const city = clean(source.adresseCommune, 100);
  const postal = source.adresseCodePostal?.trim() ?? "";
  // Outre-mer (97, 98) : Stripe y attend un autre code pays que FR, on laisse l'artisan saisir.
  if (!line1 || !city || !/^\d{5}$/.test(postal) || /^9[78]/.test(postal)) return undefined;
  return { line1, postal_code: postal, city, country: "FR" };
}

/** Ne garde que les champs renseignés (une chaîne vide effacerait la valeur chez Stripe). */
function defined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

export function connectPrefill(source: ConnectPrefillSource): ConnectPrefill {
  const raisonSociale = clean(source.raisonSociale, 200);
  const name = clean(source.nomCommercial, 200) ?? raisonSociale;
  const phone = phoneOf(source.phone);
  const email = emailOf(source.email);
  const siren = source.siren && /^\d{9}$/.test(source.siren) ? source.siren : undefined;
  const tva = source.tvaIntracom?.replace(/\s+/g, "").toUpperCase() ?? "";
  const vatId = siren && /^FR[0-9A-Z]{2}\d{9}$/.test(tva) && tva.endsWith(siren) ? tva : undefined;
  const firstName = clean(source.firstName, 100);
  const lastName = clean(source.lastName, 100);
  // Nom et contact d'une personne : seulement si l'utilisateur est le dirigeant.
  const leader =
    source.isDirigeant === true && firstName && lastName
      ? defined({ first_name: firstName, last_name: lastName, email, phone })
      : null;

  const descriptor = statementDescriptor(name);
  const profile: ConnectProfileParams = {
    business_profile: defined({
      product_description: productDescription(source.trades),
      support_phone: phone,
      support_email: email,
    }),
    ...(descriptor ? { settings: { payments: { statement_descriptor: descriptor } } } : {}),
  };

  const type = connectBusinessType(source.formeJuridiqueCode);
  if (type === "company") {
    const company = defined({
      name: raisonSociale ?? undefined,
      tax_id: siren,
      vat_id: vatId,
      phone,
      address: addressOf(source),
    });
    return {
      name,
      profile,
      account: Object.keys(company).length ? { business_type: "company", company } : null,
      person: leader ? { ...leader, relationship: { representative: true } } : null,
    };
  }
  return {
    name,
    profile,
    account:
      type === "individual" && leader ? { business_type: "individual", individual: leader } : null,
    person: null,
  };
}

/** Réponse de l'action « prefill » : de quoi créer les jetons dans le navigateur ou l'application. */
export type ConnectTokenPrefill = {
  publishableKey: string;
  account: ConnectAccountTokenData | null;
  person: ConnectPersonTokenData | null;
};

/** Jetons créés par le client, transmis avec la demande de lien d'inscription. */
export type ConnectTokens = { accountToken?: string; personToken?: string };

/** Identifiant d'un jeton Stripe reçu du client (« ct_… » ou « cpt_… »). */
export function isConnectToken(kind: "account" | "person", value: unknown): value is string {
  const pattern = kind === "account" ? /^ct_[A-Za-z0-9]{8,250}$/ : /^cpt_[A-Za-z0-9]{8,250}$/;
  return typeof value === "string" && pattern.test(value);
}

/** Paramètres encodés comme les attend l'API Stripe (`account[company][name]=…`). */
function formEncode(value: unknown, prefix: string, out: string[]): string[] {
  if (value === undefined || value === null) return out;
  if (typeof value === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>))
      formEncode(child, `${prefix}[${key}]`, out);
  } else {
    out.push(`${encodeURIComponent(prefix)}=${encodeURIComponent(String(value))}`);
  }
  return out;
}

/**
 * Requête de création d'un jeton auprès de Stripe, avec la clé publique, depuis le navigateur ou
 * l'application (l'appel réseau reste dans chaque application).
 */
export function connectTokenRequest(
  publishableKey: string,
  kind: "account" | "person",
  data: ConnectAccountTokenData | ConnectPersonTokenData,
): { url: string; init: { method: "POST"; headers: Record<string, string>; body: string } } {
  return {
    url: "https://api.stripe.com/v1/tokens",
    init: {
      method: "POST",
      headers: {
        Authorization: `Bearer ${publishableKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formEncode(data, kind, []).join("&"),
    },
  };
}

/** Identifiant du jeton dans la réponse de Stripe, sinon null. */
export function connectTokenId(kind: "account" | "person", response: unknown): string | null {
  const id =
    typeof response === "object" && response !== null ? (response as { id?: unknown }).id : null;
  return isConnectToken(kind, id) ? id : null;
}

/** Clé publique Stripe valide (jamais une clé secrète). */
export function isStripePublishableKey(value: unknown): value is string {
  return typeof value === "string" && /^pk_(test|live)_[A-Za-z0-9]{10,250}$/.test(value);
}
