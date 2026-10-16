import { CHARTER_RULE_COUNT, CHARTER_VERSION } from "@menao/core";
import type { CharterAcceptance } from "@menao/validation";
import { fr } from "@/i18n/fr";
import { supabase } from "./supabase";

export type CharterAcceptanceRow = {
  signer_name: string;
  company: string;
  siret: string;
  accepted_at: string;
};

export type CharterState =
  | { status: "a_signer"; defaults: { name: string; company: string; siret: string } }
  | { status: "signee"; acceptance: CharterAcceptanceRow };

async function myArtisan() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: artisan } = await supabase
    .from("artisans")
    .select("id, status, raison_sociale, nom_commercial, siret")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  return artisan ? { ...artisan, userId: auth.user.id } : null;
}

async function currentAcceptance(artisanId: string) {
  const { data } = await supabase
    .from("artisan_charter_acceptances")
    .select("signer_name, company, siret, accepted_at")
    .eq("artisan_id", artisanId)
    .eq("version", CHARTER_VERSION)
    .maybeSingle();
  return data;
}

/**
 * Charte qualité à signer avant l'espace artisan (ADR 0109), comme sur le site : artisan validé
 * (ou suspendu) sans signature de la version en vigueur. En cas d'erreur de lecture, on ne
 * bloque pas l'espace.
 */
export async function charterRequired(): Promise<boolean> {
  const artisan = await myArtisan();
  if (!artisan || (artisan.status !== "valide" && artisan.status !== "suspendu")) return false;
  return (await currentAcceptance(artisan.id)) === null;
}

/** État de la charte de l'artisan connecté, et valeurs proposées pour la signature. */
export async function loadCharterState(): Promise<CharterState | null> {
  const artisan = await myArtisan();
  if (!artisan) return null;
  const acceptance = await currentAcceptance(artisan.id);
  if (acceptance) return { status: "signee", acceptance };
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("user_id", artisan.userId)
    .maybeSingle();
  return {
    status: "a_signer",
    defaults: {
      name: [profile?.first_name, profile?.last_name].filter(Boolean).join(" "),
      company: artisan.nom_commercial ?? artisan.raison_sociale ?? "",
      siret: artisan.siret ?? "",
    },
  };
}

/** Signature (accept_artisan_charter : version en vigueur, toutes les règles). Message d'erreur, ou null. */
export async function signCharter(input: CharterAcceptance): Promise<string | null> {
  const { error } = await supabase.rpc("accept_artisan_charter", {
    p_version: input.version,
    p_rules_count: CHARTER_RULE_COUNT,
    p_signer_name: input.name,
    p_company: input.company,
    p_siret: input.siret,
    p_signature_path: input.signature,
  });
  if (!error) return null;
  return error.code === "22023" ? fr.proCharter.outdated : fr.errors.generic;
}
