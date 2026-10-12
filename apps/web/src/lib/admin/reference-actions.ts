"use server";

import { parseReferenceKind, referenceCode } from "@menao/core";
import { revalidatePath } from "next/cache";
import { fr } from "@/i18n/fr";
import { text, type FormState } from "@/lib/auth/form";
import { requireAdmin } from "./guard";

const t = fr.admin.references;
const PATH = "/admin/referentiels";

/**
 * Listes de métiers, travaux et pièces (F-57, ADR 0052). Les fonctions de la base vérifient les
 * droits (admin en session aal2) et inscrivent chaque modification au journal d'audit.
 */
export async function addReference(_prev: FormState, formData: FormData): Promise<FormState> {
  const kind = parseReferenceKind(text(formData, "kind"));
  if (!kind) return { error: fr.errors.generic };
  const values = { label: text(formData, "label") ?? "", trade: text(formData, "trade") ?? "" };
  const label = values.label.trim();
  const code = referenceCode(label);
  if (!code || label.length > 100) return { fieldErrors: { label: [t.errors.label] }, values };
  if (kind === "travail" && !values.trade) {
    return { fieldErrors: { trade: [t.errors.trade] }, values };
  }
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_add_reference", {
    p_kind: kind,
    p_code: code,
    p_label: label,
    p_trade_code: kind === "travail" ? values.trade : undefined,
  });
  if (error) {
    if (error.code === "23505") return { fieldErrors: { label: [t.errors.duplicate] }, values };
    return { error: fr.errors.generic, values };
  }
  revalidatePath(PATH);
  return { success: t.added(label) };
}

export async function renameReference(_prev: FormState, formData: FormData): Promise<FormState> {
  const kind = parseReferenceKind(text(formData, "kind"));
  const code = text(formData, "code");
  if (!kind || !code) return { error: fr.errors.generic };
  const values = { label: text(formData, "label") ?? "" };
  const label = values.label.trim();
  if (!referenceCode(label) || label.length > 100) {
    return { fieldErrors: { label: [t.errors.label] }, values };
  }
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_rename_reference", {
    p_kind: kind,
    p_code: code,
    p_label: label,
  });
  if (error) return { error: fr.errors.generic, values };
  revalidatePath(PATH);
  return { success: t.renamed };
}

export async function setReferenceActive(formData: FormData): Promise<void> {
  const kind = parseReferenceKind(text(formData, "kind"));
  const code = text(formData, "code");
  if (!kind || !code) return;
  const { supabase } = await requireAdmin();
  await supabase.rpc("admin_set_reference_active", {
    p_kind: kind,
    p_code: code,
    p_active: text(formData, "active") === "true",
  });
  revalidatePath(PATH);
}

export async function moveReference(formData: FormData): Promise<void> {
  const kind = parseReferenceKind(text(formData, "kind"));
  const code = text(formData, "code");
  if (!kind || !code) return;
  const { supabase } = await requireAdmin();
  await supabase.rpc("admin_move_reference", {
    p_kind: kind,
    p_code: code,
    p_up: text(formData, "direction") === "up",
  });
  revalidatePath(PATH);
}
