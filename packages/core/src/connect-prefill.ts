/**
 * Pré-remplissage du compte Stripe Connect de l'artisan (F-14 étape 6, ADR 0204, ADR 0215) : ce que
 * MENAO sait déjà (Sirene, profil, métiers) est transmis à Stripe à la création du compte, avant
 * le premier lien d'inscription, avec ce que l'artisan vient de saisir dans MENAO (date de
 * naissance, adresse personnelle, IBAN) ; chez Stripe, il ne reste qu'à relire et accepter.
 * - Identité de l'entreprise et du dirigeant, compte bancaire : par jetons Stripe créés depuis le
 *   navigateur ou l'application avec la clé publique (exigence de Stripe pour une plateforme
 *   française). Ces données vont directement à Stripe : MENAO ne les enregistre pas.
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

export type ConnectAddress = { line1: string; postal_code: string; city: string; country: "FR" };
type Address = ConnectAddress;
/** Date de naissance au format de Stripe. */
export type ConnectBirthDate = { day: number; month: number; year: number };

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
        /** Les associés de plus de 25 % sont tous déclarés (associé unique). */
        owners_provided?: true;
      };
    }
  | {
      business_type: "individual";
      individual: {
        first_name: string;
        last_name: string;
        email?: string;
        phone?: string;
        dob?: ConnectBirthDate;
        address?: Address;
      };
    };

/** Contenu du jeton « person » : le dirigeant, représentant légal de la société. */
export type ConnectPersonTokenData = {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  dob?: ConnectBirthDate;
  address?: Address;
  relationship: {
    representative: true;
    /** Fonction : « Président », « Gérant ». */
    title?: string;
    owner?: true;
    percent_ownership?: number;
  };
};

/** Contenu du jeton « bank_account » : l'IBAN des virements, au nom de l'entreprise. */
export type ConnectBankAccountTokenData = {
  country: string;
  currency: "eur";
  account_number: string;
  account_holder_name?: string;
  account_holder_type: "company" | "individual";
};

export type ConnectTokenKind = "account" | "person" | "bank_account";

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
} & ConnectFormHints;

/** De quoi présenter le formulaire de MENAO avant Stripe (ADR 0215). */
export type ConnectFormHints = {
  /** Adresse de l'établissement, proposée comme adresse personnelle (« même adresse »). */
  businessAddress: Address | null;
  /** Titulaire du compte bancaire : raison sociale, ou nom de l'entrepreneur individuel. */
  holderName: string | null;
  /**
   * Société dont l'inscrit est le dirigeant : case « je suis le seul associé », cochée d'office
   * pour une EURL ou une SASU. null : pas de case.
   */
  soleOwnerDefault: boolean | null;
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
 * Fonction du dirigeant d'après la catégorie juridique : président (SAS, SASU, 57xx), gérant (SARL,
 * EURL, 54xx). Sinon null : l'artisan la précise chez Stripe.
 */
export function representativeTitle(code: string | null): string | null {
  if (code && /^57\d{2}$/.test(code)) return "Président";
  if (code && /^54\d{2}$/.test(code)) return "Gérant";
  return null;
}

/** EURL (5498) et SASU (5720) : un seul associé. */
const SOLE_OWNER_FORMS = new Set(["5498", "5720"]);

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
function addressOf(
  source: Pick<ConnectPrefillSource, "adresseLigne" | "adresseCodePostal" | "adresseCommune">,
): Address | undefined {
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
  const businessAddress = addressOf(source) ?? null;
  if (type === "company") {
    const company = defined({
      name: raisonSociale ?? undefined,
      tax_id: siren,
      vat_id: vatId,
      phone,
      address: businessAddress ?? undefined,
    });
    const title = representativeTitle(source.formeJuridiqueCode) ?? undefined;
    return {
      name,
      profile,
      account: Object.keys(company).length ? { business_type: "company", company } : null,
      person: leader
        ? { ...leader, relationship: defined({ representative: true as const, title }) }
        : null,
      businessAddress,
      holderName: raisonSociale,
      soleOwnerDefault: leader ? SOLE_OWNER_FORMS.has(source.formeJuridiqueCode ?? "") : null,
    };
  }
  return {
    name,
    profile,
    account:
      type === "individual" && leader ? { business_type: "individual", individual: leader } : null,
    person: null,
    businessAddress,
    holderName: leader ? `${leader.first_name} ${leader.last_name}` : raisonSociale,
    soleOwnerDefault: null,
  };
}

/**
 * IBAN sans espaces et en majuscules si sa clé de contrôle est juste (ISO 13616, modulo 97) ;
 * sinon null.
 */
export function normalizeIban(value: string | null | undefined): string | null {
  const iban = (value ?? "").replace(/[\s-]+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return null;
  let remainder = 0;
  for (const char of iban.slice(4) + iban.slice(0, 4)) {
    const digits = /\d/.test(char) ? char : String(char.charCodeAt(0) - 55);
    for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1 ? iban : null;
}

/** Âge minimal d'un entrepreneur (mineur émancipé) et âge au-delà duquel la date est douteuse. */
const MIN_AGE = 16;
const MAX_AGE = 100;

/**
 * Date de naissance (AAAA-MM-JJ) d'une personne de 16 à 100 ans au jour donné (AAAA-MM-JJ, heure
 * de Paris) ; sinon null.
 */
export function birthDateOf(
  value: string | null | undefined,
  today: string,
): ConnectBirthDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((value ?? "").trim());
  const now = /^(\d{4})-(\d{2})-(\d{2})$/.exec(today);
  if (!match || !now) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return null;
  const [nowYear, nowMonth, nowDay] = [Number(now[1]), Number(now[2]), Number(now[3])];
  const age = nowYear - year - (nowMonth < month || (nowMonth === month && nowDay < day) ? 1 : 0);
  return age >= MIN_AGE && age <= MAX_AGE ? { day, month, year } : null;
}

/**
 * Adresse personnelle saisie dans MENAO, si elle est complète et en France métropolitaine (même
 * règle que l'adresse de l'établissement) ; sinon null.
 */
export function homeAddressOf(input: {
  line1: string | null | undefined;
  postalCode: string | null | undefined;
  city: string | null | undefined;
}): Address | null {
  return (
    addressOf({
      adresseLigne: input.line1 ?? null,
      adresseCodePostal: input.postalCode ?? null,
      adresseCommune: input.city ?? null,
    }) ?? null
  );
}

/**
 * Compléments saisis par l'artisan dans MENAO juste avant Stripe (ADR 0215). Ils partent
 * directement chez Stripe dans les jetons ; MENAO ne les enregistre pas.
 */
export type ConnectDetails = {
  birthDate?: ConnectBirthDate | null;
  homeAddress?: Address | null;
  /** IBAN déjà vérifié par `normalizeIban`. */
  iban?: string | null;
  /** Société : l'inscrit dirigeant est le seul associé. */
  soleOwner?: boolean;
};

/** Contenu des jetons à créer : identité de l'entreprise, dirigeant, compte bancaire. */
export type ConnectTokenData = {
  account: ConnectAccountTokenData | null;
  person: ConnectPersonTokenData | null;
  bankAccount: ConnectBankAccountTokenData | null;
};

/**
 * Ajoute au pré-remplissage les compléments saisis par l'artisan : date de naissance et adresse
 * personnelle de l'entrepreneur ou du dirigeant, associé unique (100 %, associés déclarés), IBAN.
 */
export function completeConnectPrefill(
  prefill: Pick<ConnectTokenPrefill, "account" | "person" | "holderName">,
  details: ConnectDetails,
): ConnectTokenData {
  const personal = defined({
    dob: details.birthDate ?? undefined,
    address: details.homeAddress ?? undefined,
  });
  let account = prefill.account;
  let person = prefill.person;
  if (account?.business_type === "individual") {
    account = { ...account, individual: { ...account.individual, ...personal } };
  } else if (person) {
    const owner = details.soleOwner === true;
    person = {
      ...person,
      ...personal,
      relationship: {
        ...person.relationship,
        ...(owner ? { owner: true as const, percent_ownership: 100 } : {}),
      },
    };
    if (owner && account?.business_type === "company")
      account = { ...account, company: { ...account.company, owners_provided: true } };
  }
  const iban = details.iban ? normalizeIban(details.iban) : null;
  const holder = clean(prefill.holderName, 200);
  const bankAccount: ConnectBankAccountTokenData | null = iban
    ? defined({
        country: iban.slice(0, 2),
        currency: "eur" as const,
        account_number: iban,
        account_holder_name: holder ?? undefined,
        account_holder_type:
          account?.business_type === "individual" ? ("individual" as const) : ("company" as const),
      })
    : null;
  return { account, person, bankAccount };
}

/**
 * Réponse de l'action « prefill » : de quoi créer les jetons dans le navigateur ou l'application,
 * et présenter le formulaire de MENAO (champs facultatifs : absents des anciennes versions).
 */
export type ConnectTokenPrefill = {
  publishableKey: string;
  account: ConnectAccountTokenData | null;
  person: ConnectPersonTokenData | null;
} & Partial<ConnectFormHints>;

/** Jetons créés par le client, transmis à la création du compte. */
export type ConnectTokens = { accountToken?: string; personToken?: string; bankToken?: string };

const TOKEN_PATTERNS: Record<ConnectTokenKind, RegExp> = {
  account: /^ct_[A-Za-z0-9]{8,250}$/,
  person: /^cpt_[A-Za-z0-9]{8,250}$/,
  bank_account: /^btok_[A-Za-z0-9]{8,250}$/,
};

/** Identifiant d'un jeton Stripe reçu du client (« ct_… », « cpt_… » ou « btok_… »). */
export function isConnectToken(kind: ConnectTokenKind, value: unknown): value is string {
  return typeof value === "string" && TOKEN_PATTERNS[kind].test(value);
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
  kind: ConnectTokenKind,
  data: ConnectAccountTokenData | ConnectPersonTokenData | ConnectBankAccountTokenData,
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
export function connectTokenId(kind: ConnectTokenKind, response: unknown): string | null {
  const id =
    typeof response === "object" && response !== null ? (response as { id?: unknown }).id : null;
  return isConnectToken(kind, id) ? id : null;
}

/** Clé publique Stripe valide (jamais une clé secrète). */
export function isStripePublishableKey(value: unknown): value is string {
  return typeof value === "string" && /^pk_(test|live)_[A-Za-z0-9]{10,250}$/.test(value);
}
