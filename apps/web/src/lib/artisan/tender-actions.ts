"use server";

import { FunctionsHttpError } from "@supabase/supabase-js";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { text, type FormState } from "@/lib/auth/form";
import { requireTeamPermission } from "./space";

const t = fr.pro.tenders;
const BASE = "/pro/demandes/appels-offres";
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Nouvel appel d'offres (F-136, ADR 0287) : le fichier de l'architecte est déjà déposé par le
 * navigateur dans « tender-files/<entreprise>/<uuid>.xlsx » ; la base crée l'appel d'offres
 * (formule vérifiée), puis l'Edge Function tender-sheet lit le DPGF et propose les prix.
 */
export async function createTender(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = {
    name: text(formData, "name")?.trim() ?? "",
    client: text(formData, "client")?.trim() ?? "",
    due: text(formData, "due") ?? "",
  };
  const path = text(formData, "path") ?? "";
  if (!values.name) return { fieldErrors: { name: [t.errors.name ?? ""] }, values };
  if (!path) return { fieldErrors: { file: [t.errors.file ?? ""] }, values };

  const { supabase } = await requireTeamPermission("money");
  const { data: id, error } = await supabase.rpc("artisan_create_tender", {
    p_name: values.name,
    p_client_name: values.client || undefined,
    p_due_on: DATE.test(values.due) ? values.due : undefined,
    p_source_path: path,
    p_source_name: text(formData, "fileName") ?? undefined,
  });
  if (error || !id) {
    return {
      error: error?.code === "42501" ? t.errors.forbidden : t.errors.generic,
      values,
    };
  }

  const { data, error: readError } = await supabase.functions.invoke<{
    status: string;
    posts?: number;
    priced?: number;
    warnings?: string[];
  }>("tender-sheet", { method: "POST", body: { action: "import", tenderId: id } });
  let status = data?.status ?? "error";
  if (readError instanceof FunctionsHttpError) {
    const parsed = (await readError.context.json().catch(() => null)) as { status?: string } | null;
    status = parsed?.status ?? "error";
  }
  revalidatePath(BASE);
  const query = new URLSearchParams({ lecture: status });
  if (status === "ok") {
    query.set("postes", String(data?.posts ?? 0));
    query.set("prix", String(data?.priced ?? 0));
    if (data?.warnings?.length) query.set("alertes", data.warnings.join(","));
  }
  redirect(`${BASE}/${id}?${query}` as Route);
}

const savedLine = z.object({
  id: z.uuid(),
  quantityMilli: z.number().int().min(0).max(1e12).nullable(),
  unitPriceHtCents: z.number().int().min(0).max(1e8).nullable(),
});

/** Quantités, prix et TVA de l'offre ; la base vérifie l'entreprise, la formule et le taux. */
export async function saveTender(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = z.uuid().safeParse(text(formData, "tenderId"));
  const vat = z.coerce.number().int().safeParse(text(formData, "vat"));
  let raw: unknown = null;
  try {
    raw = JSON.parse(text(formData, "lines") ?? "[]");
  } catch {
    raw = null;
  }
  const lines = z.array(savedLine).max(1000).safeParse(raw);
  if (!id.success || !vat.success || !lines.success) return { error: t.errors.generic };
  const { supabase } = await requireTeamPermission("money");
  const { error } = await supabase.rpc("artisan_save_tender", {
    p_tender_id: id.data,
    p_vat_rate_bp: vat.data,
    p_lines: lines.data,
  });
  if (error) {
    return { error: error.code === "42501" ? t.errors.forbidden : t.errors.generic };
  }
  revalidatePath(`${BASE}/${id.data}`);
  return { success: t.saved };
}

/** Nom, architecte, date de remise et suivi de l'offre. */
export async function updateTender(formData: FormData): Promise<void> {
  const id = z.uuid().safeParse(text(formData, "tenderId"));
  const status = z
    .enum(["en_cours", "envoye", "retenu", "perdu"])
    .safeParse(text(formData, "status"));
  const name = text(formData, "name")?.trim() ?? "";
  const due = text(formData, "due") ?? "";
  if (!id.success || !status.success || !name) return;
  const { supabase } = await requireTeamPermission("money");
  await supabase.rpc("artisan_update_tender", {
    p_tender_id: id.data,
    p_name: name,
    p_client_name: text(formData, "client")?.trim() || undefined,
    p_due_on: DATE.test(due) ? due : undefined,
    p_status: status.data,
  });
  revalidatePath(BASE);
  revalidatePath(`${BASE}/${id.data}`);
}

/** Suppression de l'appel d'offres, de ses lignes et du fichier de l'architecte. */
export async function deleteTender(formData: FormData): Promise<void> {
  const id = z.uuid().safeParse(text(formData, "tenderId"));
  if (!id.success) return;
  const { supabase } = await requireTeamPermission("money");
  const { data: path } = await supabase.rpc("artisan_delete_tender", { p_tender_id: id.data });
  if (path) await supabase.storage.from("tender-files").remove([path]);
  revalidatePath(BASE);
  redirect(BASE as Route);
}
