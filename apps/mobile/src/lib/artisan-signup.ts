import {
  ARTISAN_SIGNUP_DRAFT_KEY,
  ARTISAN_SIGNUP_REQUIRED_DOCUMENTS,
  ARTISAN_WELCOME_PATH,
  LEGAL_DOCUMENT_VERSIONS,
  authErrorKind,
  emptySignupDraft,
  normalizePartnerCode,
  parseSignupDraft,
  type ArtisanSignupDraft,
} from "@menao/core";
import {
  COMPANY_SEARCH_MIN_LENGTH,
  artisanSignupMetadata,
  companySearchUrl,
  parseCompanySearch,
  type ArtisanAccount,
  type ArtisanOAuthAccount,
  type ArtisanSignupProfile,
  type CompanySuggestion,
} from "@menao/validation";
import { fr } from "@/i18n/fr";
import { env } from "./env";
import { kv } from "./kv";
import { supabase } from "./supabase";

/**
 * Inscription artisan dans l'application (ADR 0113), comme sur le site (ADR 0110) : mêmes étapes,
 * mêmes contrôles, mêmes enregistrements en base. Jamais d'abonnement ici (règle 10).
 */

export type { CompanySuggestion };

/** Annuaire des entreprises (API de l'État, sans clé). Exception levée si elle ne répond pas. */
export async function searchCompanies(
  query: string,
  signal?: AbortSignal,
): Promise<CompanySuggestion[]> {
  if (query.trim().length < COMPANY_SEARCH_MIN_LENGTH) return [];
  const res = await fetch(companySearchUrl(query), { signal });
  if (!res.ok) throw new Error(`Recherche d'entreprises indisponible (${res.status})`);
  return parseCompanySearch(await res.json());
}

/** Brouillon gardé sur le téléphone : l'artisan reprend là où il en était (jamais le mot de passe). */
export async function loadSignupDraft(): Promise<ArtisanSignupDraft> {
  const saved = await kv.get(ARTISAN_SIGNUP_DRAFT_KEY);
  if (!saved) return emptySignupDraft();
  try {
    return parseSignupDraft(JSON.parse(saved));
  } catch {
    return emptySignupDraft();
  }
}

export function saveSignupDraft(draft: ArtisanSignupDraft): Promise<void> {
  return kv.set(ARTISAN_SIGNUP_DRAFT_KEY, JSON.stringify(draft));
}

export function clearSignupDraft(): Promise<void> {
  return kv.remove(ARTISAN_SIGNUP_DRAFT_KEY);
}

const legalVersions = () =>
  Object.fromEntries(
    ARTISAN_SIGNUP_REQUIRED_DOCUMENTS.map((doc) => [doc, LEGAL_DOCUMENT_VERSIONS[doc]]),
  );

/** Lien de l'e-mail de confirmation, ouvert sur le site (« Votre profil est créé »). */
const welcomeUrl = `${env.siteUrl}/auth/confirm?next=${encodeURIComponent(ARTISAN_WELCOME_PATH)}`;

/**
 * Création du compte par e-mail avec les choix du parcours : la base n'en déduit que
 * artisan_en_attente (ADR 0006). Supabase envoie l'e-mail avec le code à 6 chiffres.
 * Renvoie le message d'erreur, ou null.
 */
export async function signUpArtisan(
  profile: ArtisanSignupProfile,
  account: ArtisanAccount,
  /** Code de parrainage saisi (F-60), revérifié par la base. */
  referralCode: string | null = null,
): Promise<string | null> {
  const { error } = await supabase.auth.signUp({
    email: account.email,
    password: account.password,
    options: {
      emailRedirectTo: welcomeUrl,
      data: {
        account_type: "artisan",
        first_name: account.firstName,
        last_name: account.lastName,
        phone: account.phone ?? null,
        siret: profile.siret,
        marketing_opt_in: account.marketingOptIn,
        legal: legalVersions(),
        signup: artisanSignupMetadata(profile, normalizePartnerCode(referralCode)),
      },
    },
  });
  return error ? fr.errors[authErrorKind(error.code)] : null;
}

/** SIRET vérifié auprès de l'INSEE dès la création du compte ; un échec n'empêche rien. */
async function checkSiret() {
  await supabase.functions.invoke("sirene-check", { method: "POST" }).catch(() => null);
}

/** Code reçu par e-mail : confirme l'adresse et ouvre la session. Message d'erreur, ou null. */
export async function verifyArtisanCode(email: string, code: string): Promise<string | null> {
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
  if (error) return fr.proSignup.code.invalid;
  await checkSiret();
  return null;
}

export async function resendArtisanCode(email: string): Promise<string | null> {
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: welcomeUrl },
  });
  return error?.code === "over_email_send_rate_limit" ? fr.errors[authErrorKind(error.code)] : null;
}

/**
 * Compte Google ou Apple à finaliser (ADR 0108) transformé en compte artisan en attente, avec les
 * choix du parcours ; le jeton est ensuite rafraîchi pour porter le nouveau rôle.
 */
export async function completeArtisanOAuth(
  profile: ArtisanSignupProfile,
  account: ArtisanOAuthAccount,
  referralCode: string | null = null,
): Promise<string | null> {
  const { error } = await supabase.rpc("complete_artisan_oauth_signup", {
    p_first_name: account.firstName,
    p_last_name: account.lastName,
    p_phone: account.phone ?? "",
    p_marketing_opt_in: account.marketingOptIn,
    p_legal: legalVersions(),
    p_siret: profile.siret,
    p_signup: artisanSignupMetadata(profile, normalizePartnerCode(referralCode)),
  });
  if (error) return error.code === "22023" ? error.message : fr.errors.generic;
  await supabase.auth.refreshSession();
  await checkSiret();
  return null;
}

/** Nom repris du fournisseur, pour préremplir le compte après Google ou Apple. */
export async function loadProviderName(): Promise<{ firstName: string; lastName: string }> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { firstName: "", lastName: "" };
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("user_id", data.user.id)
    .maybeSingle();
  return { firstName: profile?.first_name ?? "", lastName: profile?.last_name ?? "" };
}

export type WelcomeData = {
  name: string | null;
  trades: string[];
  baseLabel: string | null;
  radiusKm: number | null;
  /** Vérification du SIRET auprès de l'INSEE à signaler, sinon null. */
  sirene: "siret_missing" | "unavailable" | "inactive" | null;
};

/** « Votre profil est créé » : la fiche telle que la base l'a enregistrée. */
export async function loadWelcome(): Promise<WelcomeData | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: artisan } = await supabase
    .from("artisans")
    .select(
      "id, siret, raison_sociale, nom_commercial, base_label, radius_km, sirene_checked_at, sirene_active, artisan_trades(trade_code)",
    )
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!artisan) return null;
  const codes = artisan.artisan_trades.map((t) => t.trade_code);
  const { data: trades } = codes.length
    ? await supabase.from("trades").select("label").in("code", codes).order("sort_order")
    : { data: [] };
  return {
    name: artisan.nom_commercial ?? artisan.raison_sociale,
    trades: (trades ?? []).map((t) => t.label),
    baseLabel: artisan.base_label,
    radiusKm: artisan.radius_km,
    sirene:
      artisan.siret === null
        ? "siret_missing"
        : artisan.sirene_checked_at === null
          ? "unavailable"
          : artisan.sirene_active === false
            ? "inactive"
            : null,
  };
}
