"use server";

import { FunctionsHttpError } from "@supabase/supabase-js";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { text, type FormState } from "@/lib/auth/form";
import {
  CEILING_FINISHES,
  FLOOR_FINISHES,
  normalizePlanCounts,
  PLAN_COUNT_KEYS,
  planTakeoff,
  type PriceHistoryLine,
  suggestTenderPrice,
  takeoffFigures,
  tenderQuoteLines,
  type TenderQuoteLine,
  WALL_FINISHES,
} from "@menao/core";
import { getTenderRooms } from "./tenders";
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

/** Suppression de l'appel d'offres, de ses lignes et des fichiers de l'architecte (DPGF ou plans). */
export async function deleteTender(formData: FormData): Promise<void> {
  const id = z.uuid().safeParse(text(formData, "tenderId"));
  if (!id.success) return;
  const { supabase } = await requireTeamPermission("money");
  const { data: paths } = await supabase.rpc("artisan_delete_tender", { p_tender_id: id.data });
  if (paths?.length) await supabase.storage.from("tender-files").remove(paths);
  revalidatePath(BASE);
  redirect(BASE as Route);
}

/**
 * « Reprendre un DPGF » dans l'éditeur de devis (F-138, ADR 0289) : postes chiffrés de l'appel
 * d'offres, en lignes de devis à la TVA de l'offre (0 % pour une entreprise non assujettie). Rien
 * n'est enregistré : l'artisan relit puis enregistre son devis comme d'habitude.
 */
export async function tenderLinesForQuote(
  tenderId: string,
  existingLines: number,
): Promise<
  | { ok: true; lines: TenderQuoteLine[]; skipped: number; truncated: number }
  | { ok: false; error: string }
> {
  const id = z.uuid().safeParse(tenderId);
  if (!id.success) return { ok: false, error: t.errors.generic ?? "" };
  const { supabase, artisanId } = await requireTeamPermission("money");
  const [{ data: tender }, { data: rows }, { data: artisan }] = await Promise.all([
    supabase.from("tenders").select("vat_rate_bp").eq("id", id.data).maybeSingle(),
    supabase
      .from("tender_lines")
      .select("kind, lot, code, designation, unit, quantity_milli, unit_price_ht_cents")
      .eq("tender_id", id.data)
      .order("position"),
    supabase.from("artisans").select("assujetti_tva").eq("id", artisanId).maybeSingle(),
  ]);
  if (!tender) return { ok: false, error: t.errors.generic ?? "" };
  const vat = artisan?.assujetti_tva === false ? 0 : tender.vat_rate_bp;
  const result = tenderQuoteLines(
    (rows ?? []).map((r) => ({
      kind: r.kind as "titre" | "poste",
      lot: r.lot,
      code: r.code,
      designation: r.designation,
      unit: r.unit,
      quantityMilli: r.quantity_milli,
      unitPriceHtCents: r.unit_price_ht_cents,
    })),
    vat,
    Math.max(0, Math.floor(existingLines)),
  );
  return { ok: true, ...result };
}

// ---------------------------------------------------------------------------------------------
// DPGF depuis les plans (F-140, ADR 0291)
// ---------------------------------------------------------------------------------------------

const planFile = z.object({
  path: z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(pdf|jpg|png)$/),
  name: z.string().max(200),
});

/** Lecture des plans par l'Edge Function tender-sheet, puis retour sur l'appel d'offres. */
async function readPlansAndRedirect(
  supabase: Awaited<ReturnType<typeof requireTeamPermission>>["supabase"],
  id: string,
): Promise<never> {
  const { data, error: readError } = await supabase.functions.invoke<{
    status: string;
    rooms?: number;
    warnings?: string[];
  }>("tender-sheet", { method: "POST", body: { action: "plan", tenderId: id } });
  let status = data?.status ?? "error";
  if (readError instanceof FunctionsHttpError) {
    const parsed = (await readError.context.json().catch(() => null)) as { status?: string } | null;
    status = parsed?.status ?? "error";
  }
  revalidatePath(BASE);
  const query = new URLSearchParams({ lecture: status });
  if (status === "ok") {
    query.set("pieces", String(data?.rooms ?? 0));
    if (data?.warnings?.length) query.set("alertes", data.warnings.join(","));
  }
  redirect(`${BASE}/${id}?${query}` as Route);
}

/**
 * Nouvel appel d'offres depuis les plans : les plans sont déjà déposés par le navigateur dans
 * « tender-files/<entreprise>/<uuid>.pdf|jpg|png » ; la base crée l'appel d'offres (formule,
 * fichiers et métiers vérifiés), puis l'Edge Function lit les plans.
 */
export async function createPlanTender(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = {
    name: text(formData, "name")?.trim() ?? "",
    client: text(formData, "client")?.trim() ?? "",
    due: text(formData, "due") ?? "",
  };
  if (!values.name) return { fieldErrors: { name: [t.errors.name ?? ""] }, values };
  let raw: unknown = null;
  try {
    raw = JSON.parse(text(formData, "files") ?? "[]");
  } catch {
    raw = null;
  }
  const files = z.array(planFile).min(1).max(10).safeParse(raw);
  if (!files.success) return { fieldErrors: { files: [t.plan.errors.files] }, values };
  const trades = formData
    .getAll("trades")
    .filter((v): v is string => typeof v === "string" && /^[a-z0-9-]{1,60}$/.test(v));
  if (trades.length === 0) return { fieldErrors: { trades: [t.plan.errors.trades] }, values };

  const { supabase } = await requireTeamPermission("money");
  const { data: id, error } = await supabase.rpc("artisan_create_plan_tender", {
    p_name: values.name,
    p_files: files.data,
    p_trades: trades.slice(0, 20),
    p_client_name: values.client || undefined,
    p_due_on: DATE.test(values.due) ? values.due : undefined,
  });
  if (error || !id) {
    return {
      error:
        error?.code === "42501"
          ? t.errors.forbidden
          : error?.code === "22023"
            ? error.message
            : t.errors.generic,
      values,
    };
  }
  return readPlansAndRedirect(supabase, id);
}

/** Relire les plans (lecture précédente en échec, ou relevé à refaire). */
export async function rereadPlans(formData: FormData): Promise<void> {
  const id = z.uuid().safeParse(text(formData, "tenderId"));
  if (!id.success) return;
  const { supabase } = await requireTeamPermission("money");
  await readPlansAndRedirect(supabase, id.data);
}

const savedRoom = z.object({
  id: z.uuid().nullable(),
  level: z.string().max(40).nullable(),
  name: z.string().trim().min(1).max(80),
  areaCm2: z.number().int().min(1).max(100_000_000).nullable(),
  perimeterMm: z.number().int().min(1).max(2_000_000).nullable(),
  heightMm: z.number().int().min(1500).max(10_000).nullable(),
  wet: z.boolean(),
  habitable: z.boolean(),
});

/** Relevé corrigé par l'artisan ; une pièce modifiée ou ajoutée passe en « saisi » (base). */
export async function savePlanRooms(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = z.uuid().safeParse(text(formData, "tenderId"));
  let raw: unknown = null;
  let rawCounts: unknown = null;
  try {
    raw = JSON.parse(text(formData, "rooms") ?? "[]");
    rawCounts = JSON.parse(text(formData, "counts") ?? "{}");
  } catch {
    raw = null;
  }
  const rooms = z.array(savedRoom).max(200).safeParse(raw);
  if (!id.success || !rooms.success) return { error: t.plan.invalid };
  const counts = normalizePlanCounts(rawCounts);
  const { supabase } = await requireTeamPermission("money");
  const { error } = await supabase.rpc("artisan_save_plan_rooms", {
    p_tender_id: id.data,
    p_rooms: rooms.data,
    p_counts: Object.fromEntries(PLAN_COUNT_KEYS.map((k) => [k, counts[k]])),
  });
  if (error) {
    return { error: error.code === "42501" ? t.errors.forbidden : t.errors.generic };
  }
  revalidatePath(`${BASE}/${id.data}`);
  return { success: t.plan.saved };
}

const finish = z.object({
  id: z.uuid(),
  floor: z.enum(FLOOR_FINISHES),
  walls: z.enum(WALL_FINISHES),
  ceiling: z.enum(CEILING_FINISHES),
  tileHeightMm: z.number().int().min(100).max(4000).nullable(),
});

/**
 * Création du DPGF depuis le relevé (ADR 0292) : revêtements enregistrés, puis lots et postes
 * calculés par métier (packages/core), prix repris des anciens devis, enregistrés par la base
 * (formule et entreprise vérifiées). La vérification des quantités est à refaire.
 */
export async function createPlanDpgf(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = z.uuid().safeParse(text(formData, "tenderId"));
  let raw: unknown = null;
  try {
    raw = JSON.parse(text(formData, "finishes") ?? "[]");
  } catch {
    raw = null;
  }
  const finishes = z.array(finish).max(200).safeParse(raw);
  if (!id.success || !finishes.success) return { error: t.plan.finishes.invalid };
  const { supabase } = await requireTeamPermission("money");
  const { error: finishError } = await supabase.rpc("artisan_save_plan_finishes", {
    p_tender_id: id.data,
    p_finishes: finishes.data,
  });
  if (finishError) {
    return { error: finishError.code === "42501" ? t.errors.forbidden : t.errors.generic };
  }

  const [{ data: tender }, rooms, { data: history }] = await Promise.all([
    supabase.from("tenders").select("plan_trades, plan_counts").eq("id", id.data).maybeSingle(),
    getTenderRooms(supabase, id.data),
    supabase.rpc("artisan_price_history"),
  ]);
  if (!tender) return { error: t.errors.generic };
  const { data: trades } = await supabase
    .from("trades")
    .select("code, label")
    .in("code", tender.plan_trades)
    .order("sort_order");
  const lines = planTakeoff(
    rooms.map((r) => ({
      name: r.name,
      level: r.level,
      areaCm2: r.area_cm2,
      perimeterMm: r.perimeter_mm,
      heightMm: r.height_mm,
      wet: r.wet,
      habitable: r.habitable,
      source: r.source,
      uncertain: r.uncertain,
      finishes: {
        floor: r.floor ?? "aucun",
        walls: r.walls ?? "aucun",
        ceiling: r.ceiling ?? "aucun",
        tileHeightMm: r.tile_height_mm,
      },
    })),
    normalizePlanCounts(tender.plan_counts),
    trades ?? [],
  );
  const prices: PriceHistoryLine[] = (history ?? []).map((h) => ({
    designation: h.designation,
    unit: h.unit,
    unitPriceHtCents: h.unit_price_ht_cents,
    usedOn: h.used_on,
  }));
  const { error } = await supabase.rpc("artisan_import_plan_lines", {
    p_tender_id: id.data,
    p_lines: lines.map((line) => {
      const suggestion = line.kind === "poste" ? suggestTenderPrice(line, prices) : null;
      return {
        ...line,
        unitPriceHtCents: suggestion?.unitPriceHtCents ?? null,
        priceReference: suggestion?.reference ?? null,
      };
    }),
  });
  if (error) {
    return { error: error.code === "42501" ? t.errors.forbidden : t.errors.generic };
  }
  const figures = takeoffFigures(lines);
  revalidatePath(`${BASE}/${id.data}`);
  const query = new URLSearchParams({
    dpgf: "ok",
    lots: String(figures.lots),
    postes: String(figures.posts),
    manque: String(figures.missing),
  });
  redirect(`${BASE}/${id.data}?${query}` as Route);
}

/** « J'ai vérifié les quantités » : condition de l'export d'un DPGF créé depuis les plans. */
export async function checkTenderQuantities(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = z.uuid().safeParse(text(formData, "tenderId"));
  if (!id.success) return { error: t.plan.check.error };
  const { supabase } = await requireTeamPermission("money");
  const { error } = await supabase.rpc("artisan_check_tender_quantities", {
    p_tender_id: id.data,
    p_checked: text(formData, "checked") === "true",
  });
  if (error) return { error: error.code === "22023" ? error.message : t.plan.check.error };
  revalidatePath(`${BASE}/${id.data}`);
  return {};
}
