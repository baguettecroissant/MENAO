"use server";

import { eurosToCents, normalizePartnerCode } from "@menao/core";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fr } from "@/i18n/fr";
import { text, type FormState } from "@/lib/auth/form";
import { requireAdmin } from "./guard";

const t = fr.admin.partners;
const PATH = "/admin/partenaires";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Montant facultatif : vide → absent (montant par défaut) ; invalide → erreur du champ. */
function optionalCents(formData: FormData, name: string) {
  const cents = eurosToCents(text(formData, name));
  return Number.isNaN(cents) ? { invalid: true as const } : { cents: cents ?? undefined };
}

/**
 * Création ou modification d'un partenaire (F-59, ADR 0136). La base vérifie le rôle (admin en
 * session aal2), le code, le SIRET et l'e-mail, et inscrit la modification au journal.
 */
export async function savePartner(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, "id");
  const values = Object.fromEntries(
    ["code", "nom", "siret", "email", "status", "montantDemande", "montantAbonne", "notes"].map(
      (k) => [k, text(formData, k) ?? ""],
    ),
  );
  const demande = optionalCents(formData, "montantDemande");
  const abonne = optionalCents(formData, "montantAbonne");
  if ("invalid" in demande) return { fieldErrors: { montantDemande: [t.errors.amount] }, values };
  if ("invalid" in abonne) return { fieldErrors: { montantAbonne: [t.errors.amount] }, values };
  const status = values.status === "suspendu" ? "suspendu" : "actif";
  const code = id ? values.code : normalizePartnerCode(values.code);
  if (!id && !code) return { fieldErrors: { code: [t.fields.codeHint] }, values };

  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("admin_save_partner", {
    p_code: code ?? "",
    p_nom: values.nom ?? "",
    p_siret: values.siret ?? "",
    p_contact_email: values.email ?? "",
    p_status: status,
    p_montant_demande_centimes: demande.cents,
    p_montant_abonne_centimes: abonne.cents,
    p_notes: values.notes || undefined,
    p_id: id && UUID.test(id) ? id : undefined,
  });
  if (error) {
    return { error: error.code === "22023" ? error.message : fr.errors.generic, values };
  }
  revalidatePath(PATH);
  if (!id && data) redirect(`${PATH}/${data}` as Route);
  return { success: t.saved };
}

export async function savePartnerSettings(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const s = t.settings;
  const values = Object.fromEntries(
    ["montantDemande", "montantAbonne", "delai", "plafond"].map((k) => [
      k,
      text(formData, k) ?? "",
    ]),
  );
  const demande = optionalCents(formData, "montantDemande");
  const abonne = optionalCents(formData, "montantAbonne");
  if ("invalid" in demande) return { fieldErrors: { montantDemande: [t.errors.amount] }, values };
  if ("invalid" in abonne) return { fieldErrors: { montantAbonne: [t.errors.amount] }, values };
  const delai = Number(values.delai);
  if (!Number.isInteger(delai) || delai < 0 || delai > 180) {
    return { fieldErrors: { delai: [t.errors.days] }, values };
  }
  const plafond = values.plafond?.trim() ? Number(values.plafond) : undefined;
  if (plafond !== undefined && (!Number.isInteger(plafond) || plafond < 1 || plafond > 10000)) {
    return { fieldErrors: { plafond: [t.errors.cap] }, values };
  }
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_save_partner_settings", {
    p_delai_validation_jours: delai,
    p_montant_demande_centimes: demande.cents,
    p_montant_abonne_centimes: abonne.cents,
    p_plafond_demandes_mois: plafond,
  });
  if (error) return { error: error.code === "22023" ? error.message : fr.errors.generic, values };
  revalidatePath(PATH);
  return { success: s.saved };
}

/** Virement fait : les commissions validées du partenaire passent payées, avec la référence. */
export async function markPartnerCommissionsPaid(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ids = formData.getAll("commission").filter((v): v is string => typeof v === "string");
  const reference = text(formData, "reference")?.trim() ?? "";
  if (!reference) return { fieldErrors: { reference: [t.errors.reference] } };
  const partnerId = text(formData, "partner");
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("admin_mark_commissions_paid", {
    p_ids: ids.filter((id) => UUID.test(id)),
    p_reference: reference,
  });
  if (error) return { error: error.code === "22023" ? error.message : fr.errors.generic };
  revalidatePath(PATH);
  if (partnerId && UUID.test(partnerId)) revalidatePath(`${PATH}/${partnerId}`);
  return { success: t.commissions.paid(data ?? 0) };
}

export async function cancelPartnerCommission(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = text(formData, "commission") ?? "";
  const reason = text(formData, "reason")?.trim() ?? "";
  if (!reason) return { fieldErrors: { reason: [t.errors.reason] } };
  if (!UUID.test(id)) return { error: fr.errors.generic };
  const partnerId = text(formData, "partner");
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_cancel_partner_commission", {
    p_id: id,
    p_reason: reason,
  });
  if (error) return { error: error.code === "22023" ? error.message : fr.errors.generic };
  revalidatePath(PATH);
  if (partnerId && UUID.test(partnerId)) revalidatePath(`${PATH}/${partnerId}`);
  return { success: t.commissions.cancelDone };
}

/** Lien de l'espace partenaire (ADR 0139) : créé ou renouvelé ; l'ancien ne répond plus. */
export async function renewPartnerDashboard(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = text(formData, "partner") ?? "";
  if (!UUID.test(id)) return { error: fr.errors.generic };
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_renew_partner_dashboard", { p_id: id });
  if (error) return { error: error.code === "22023" ? error.message : fr.errors.generic };
  revalidatePath(`${PATH}/${id}`);
  return { success: t.space.renewed };
}
