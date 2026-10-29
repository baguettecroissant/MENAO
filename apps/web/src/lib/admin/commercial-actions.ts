"use server";

import { eurosToCents, formatZoneCodes, normalizePartnerCode, parseZoneCodes } from "@menao/core";
import { FunctionsHttpError } from "@supabase/supabase-js";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fr } from "@/i18n/fr";
import { text, type FormState } from "@/lib/auth/form";
import { requireAdmin } from "./guard";

const t = fr.admin.commercials;
const PATH = "/admin/commerciaux";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVALID = t.errors.invalid ?? fr.errors.generic;
// Résultats et primes (F-65, lot 3, ADR 0207).
const tr = fr.admin.commercialResults;
/** Plafond d'une prime en base (10 000 €). */
const MAX_CENTS = 1_000_000;

/**
 * Invitation d'un commercial (F-65, ADR 0205) : l'Edge Function commercial-invite crée le compte
 * avec le rôle « commercial » (clé serveur), puis la fiche et son code (admin en session aal2,
 * vérifié par la base), et Supabase envoie l'e-mail pour choisir le mot de passe.
 */
export async function inviteCommercial(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = Object.fromEntries(
    ["firstName", "lastName", "email", "code"].map((k) => [k, text(formData, k)?.trim() ?? ""]),
  );
  const code = normalizePartnerCode(values.code);
  const fieldErrors: Record<string, string[]> = {};
  if (!values.firstName || values.firstName.length > 100) fieldErrors.firstName = [INVALID];
  if (!values.lastName || values.lastName.length > 100) fieldErrors.lastName = [INVALID];
  if (!EMAIL.test(values.email ?? "")) fieldErrors.email = [INVALID];
  if (!code) fieldErrors.code = [t.fields.codeHint];
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.functions.invoke<{ status: string }>("commercial-invite", {
    method: "POST",
    body: {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      code,
    },
  });
  let status = data?.status ?? "unavailable";
  if (error instanceof FunctionsHttpError) {
    const parsed = (await error.context.json().catch(() => null)) as { status?: string } | null;
    status = parsed?.status ?? "unavailable";
  }
  if (status !== "ok") {
    const message = t.errors[status] ?? t.errors.unavailable ?? fr.errors.generic;
    if (status === "code_taken") return { fieldErrors: { code: [message] }, values };
    if (status === "email_taken") return { fieldErrors: { email: [message] }, values };
    return { error: message, values };
  }
  revalidatePath(PATH);
  return { success: t.invited(values.email ?? "") };
}

/** Suspendre ou réactiver un commercial : son code n'attribue plus les inscriptions. */
export async function setCommercialStatus(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = text(formData, "id") ?? "";
  const status = text(formData, "status") === "suspendu" ? "suspendu" : "actif";
  if (!UUID.test(id)) return { error: t.statusError };
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_set_commercial_status", {
    p_id: id,
    p_status: status,
  });
  if (error) return { error: t.statusError };
  revalidatePath(PATH);
  return {};
}

/** Montant facultatif : vide → absent (prime non décidée) ; invalide ou hors bornes → erreur. */
function optionalCents(formData: FormData, name: string) {
  const cents = eurosToCents(text(formData, name));
  return Number.isNaN(cents) || (cents ?? 0) > MAX_CENTS
    ? { invalid: true as const }
    : { cents: cents ?? undefined };
}

/** Message d'erreur de la base : 22023 = règle métier, montré tel quel ; sinon message générique. */
const dbError = (error: { code: string; message: string }) =>
  error.code === "22023" ? error.message : tr.errors.generic;

/** Fiche du commercial et liste à jour après une action (chiffres et primes). */
function revalidateCommercial(id: string | undefined) {
  revalidatePath(PATH);
  if (id && UUID.test(id)) revalidatePath(`${PATH}/${id}`);
}

/**
 * Retour sur la fiche avec le message de réussite dans l'adresse : le formulaire qui l'a envoyé
 * peut disparaître (plus rien à transférer ou à payer), le message reste.
 */
function backToCommercial(
  id: string,
  done: "transfert" | "liberation" | "paiement" | "annulation",
  n = 0,
) {
  redirect(`${PATH}/${id}?fait=${done}&n=${n}` as Route);
}

/**
 * Réglages des primes des commerciaux (F-65, lot 3, ADR 0207) : montants vides tant qu'ils ne
 * sont pas décidés par les associés (règle 15), délai de vérification, objectif mensuel. La base
 * vérifie le rôle (admin en session aal2) et les bornes, et inscrit la modification au journal.
 */
export async function saveCommercialBonusSettings(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = Object.fromEntries(
    ["validation", "subscription", "delay", "objective"].map((k) => [k, text(formData, k) ?? ""]),
  );
  const validation = optionalCents(formData, "validation");
  const subscription = optionalCents(formData, "subscription");
  if ("invalid" in validation) return { fieldErrors: { validation: [tr.errors.amount] }, values };
  if ("invalid" in subscription) {
    return { fieldErrors: { subscription: [tr.errors.amount] }, values };
  }
  const delay = values.delay?.trim() ? Number(values.delay) : Number.NaN;
  if (!Number.isInteger(delay) || delay < 0 || delay > 180) {
    return { fieldErrors: { delay: [tr.errors.delay] }, values };
  }
  const objective = values.objective?.trim() ? Number(values.objective) : undefined;
  if (
    objective !== undefined &&
    (!Number.isInteger(objective) || objective < 1 || objective > 1000)
  ) {
    return { fieldErrors: { objective: [tr.errors.objective] }, values };
  }
  const { supabase } = await requireAdmin();
  // Valeur absente (undefined) = nulle en base : jamais de null explicite (paramètres facultatifs).
  const { error } = await supabase.rpc("admin_save_commercial_bonus_settings", {
    p_prime_validation_centimes: validation.cents,
    p_prime_abonnement_centimes: subscription.cents,
    p_delai_validation_jours: delay,
    p_objectif_valides_mois: objective,
  });
  if (error) return { error: dbError(error), values };
  revalidatePath(PATH);
  return { success: tr.settings.saved };
}

/** Zone d'un commercial : débuts de codes postaux ; vide = aucune zone (tout le département). */
export async function setCommercialZone(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, "commercial") ?? "";
  const raw = text(formData, "zone") ?? "";
  if (!UUID.test(id)) return { error: tr.errors.generic, values: { zone: raw } };
  const { codes, invalid } = parseZoneCodes(raw);
  if (invalid.length > 0) {
    return {
      fieldErrors: { zone: [tr.detail.zoneInvalid(invalid.join(", "))] },
      values: { zone: raw },
    };
  }
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_set_commercial_zone", { p_id: id, p_codes: codes });
  if (error) return { error: dbError(error), values: { zone: raw } };
  revalidateCommercial(id);
  // Zone remise en forme (dédoublonnée, triée) dans le champ.
  return { success: tr.detail.zoneSaved, values: { zone: formatZoneCodes(codes) } };
}

/**
 * Prospects suivis par un commercial qui s'en va : transférés à un autre commercial actif, ou
 * libérés (plus suivis par personne) ; la base vérifie le destinataire et journalise.
 */
export async function transferCommercialProspects(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const from = text(formData, "commercial") ?? "";
  const to = text(formData, "to") ?? "";
  // Libération (bouton à part, après confirmation) : plus suivis par personne.
  const release = text(formData, "release") === "1";
  if (!UUID.test(from)) return { error: tr.errors.generic };
  if (!release && !UUID.test(to)) return { fieldErrors: { to: [tr.detail.choose] } };
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("admin_transfer_prospects", {
    p_from: from,
    p_to: release ? undefined : to,
  });
  if (error) return { error: dbError(error) };
  revalidateCommercial(from);
  if (!release) revalidatePath(`${PATH}/${to}`);
  backToCommercial(from, release ? "liberation" : "transfert", data ?? 0);
  return {};
}

/** Virement fait : les primes cochées (à payer) passent payées, avec la référence du virement. */
export async function markCommercialBonusesPaid(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ids = formData
    .getAll("bonus")
    .filter((v): v is string => typeof v === "string" && UUID.test(v));
  const reference = text(formData, "reference")?.trim() ?? "";
  // Référence gardée dans le champ en cas d'erreur.
  const values = { reference };
  if (!reference) {
    return { fieldErrors: { reference: [fr.admin.partners.errors.reference] }, values };
  }
  if (ids.length === 0) return { error: tr.detail.paid(0), values };
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("admin_mark_commercial_bonuses_paid", {
    p_ids: ids,
    p_reference: reference,
  });
  if (error) return { error: dbError(error), values };
  const commercial = text(formData, "commercial") ?? "";
  revalidateCommercial(commercial);
  if (UUID.test(commercial)) backToCommercial(commercial, "paiement", data ?? 0);
  return { success: tr.detail.paid(data ?? 0) };
}

/** Annulation d'une prime en attente ou à payer, avec son motif (journalisée par la base). */
export async function cancelCommercialBonus(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = text(formData, "bonus") ?? "";
  const reason = text(formData, "reason")?.trim() ?? "";
  // Motif gardé dans le champ en cas d'erreur.
  const values = { reason };
  if (!reason) return { fieldErrors: { reason: [fr.admin.partners.errors.reason] }, values };
  if (!UUID.test(id)) return { error: tr.errors.generic, values };
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_cancel_commercial_bonus", {
    p_id: id,
    p_reason: reason,
  });
  if (error) return { error: dbError(error), values };
  const commercial = text(formData, "commercial") ?? "";
  revalidateCommercial(commercial);
  if (UUID.test(commercial)) backToCommercial(commercial, "annulation");
  return { success: tr.detail.cancelled };
}
