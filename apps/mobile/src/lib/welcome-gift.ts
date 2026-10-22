import { parseWelcomeGift, type WelcomeGift, type WelcomeGiftChoice } from "@menao/validation";
import { fr } from "@/i18n/fr";
import { supabase } from "./supabase";

/**
 * Cadeau de bienvenue du filleul (F-60, ADR 0154) : état et adresse pré-remplie
 * (`my_welcome_gift`). Null : aucun cadeau (inscrit sans parrain, dossier pas encore validé).
 */
export async function loadWelcomeGift(): Promise<WelcomeGift | null> {
  const { data } = await supabase.rpc("my_welcome_gift");
  return parseWelcomeGift(data);
}

/** Choix du cadeau, une seule fois : demande transmise à l'équipe (`choose_welcome_gift`). */
export async function chooseWelcomeGift(choice: WelcomeGiftChoice): Promise<string | null> {
  const { error } = await supabase.rpc("choose_welcome_gift", {
    p_item: choice.item,
    p_size: choice.size ?? "",
    p_recipient: choice.recipient,
    p_adresse_ligne: choice.ligne,
    p_adresse_code_postal: choice.code_postal,
    p_adresse_commune: choice.commune,
  });
  if (!error) return null;
  return error.code === "22023" || error.code === "42501" ? error.message : fr.errors.generic;
}
