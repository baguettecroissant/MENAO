import { kv } from "./kv";
import { supabase } from "./supabase";

/**
 * Date de naissance lue sur la pièce d'identité (ADR 0375), gardée dans le trousseau du téléphone
 * entre le dépôt de la pièce et l'écran « Paiements », où elle pré-remplit le champ. MENAO ne
 * l'enregistre pas : elle part chez Stripe depuis le téléphone, puis elle est effacée. Rangée par
 * compte : un autre compte sur le même téléphone ne la voit pas.
 */
async function key(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  return id ? `menao.naissance.${id}` : null;
}

/** `date` : AAAA-MM-JJ, telle que renvoyée par la lecture du document. */
export async function rememberBirthDate(date: string): Promise<void> {
  const k = await key();
  if (k) await kv.set(k, date);
}

export async function recallBirthDate(): Promise<string | null> {
  const k = await key();
  const value = k ? await kv.get(k) : null;
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export async function forgetBirthDate(): Promise<void> {
  const k = await key();
  if (k) await kv.remove(k);
}
