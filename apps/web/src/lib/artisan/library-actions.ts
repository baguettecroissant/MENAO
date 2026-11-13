"use server";

import {
  COMPONENT_KINDS,
  PRICE_PICKS,
  parisToday,
  parseCoefficient,
  parseEuros,
  parseRatePercent,
  QUOTE_UNITS,
} from "@menao/core";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { text, type FormState } from "@/lib/auth/form";
import { refreshWorkPrices } from "./library";
import { requireTeamPermission } from "./space";

const t = fr.pro.library;
const BASE = "/pro/bibliotheque";
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Montant en euros saisi (« 35 », « 35,50 ») ; vide = null ; invalide = undefined. */
function euros(value: string | undefined): number | null | undefined {
  if (!value?.trim()) return null;
  return parseEuros(value) ?? undefined;
}

/** Réglages de chiffrage (F-141, ADR 0293) : RLS, l'entreprise seule. */
export async function saveLibrarySettings(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const hourCost = euros(text(formData, "hourCost"));
  const hourPrice = euros(text(formData, "hourPrice"));
  const coefText = text(formData, "coef")?.trim() ?? "";
  const coef = coefText ? parseCoefficient(coefText) : 10_000;
  const alertText = text(formData, "alert")?.trim() ?? "";
  const alert = alertText ? parseRatePercent(alertText) : null;
  if (
    hourCost === undefined ||
    hourPrice === undefined ||
    coef === null ||
    (alertText && alert === null)
  ) {
    return { error: t.settings.invalid };
  }
  const { supabase, artisanId } = await requireTeamPermission("money");
  const { error } = await supabase.from("artisan_pricing_settings").upsert({
    artisan_id: artisanId,
    hour_cost_cents: hourCost,
    hour_price_cents: hourPrice,
    supply_coef_bp: coef,
    margin_alert_bp: alert,
  });
  if (error) return { error: t.settings.invalid };
  await refreshWorkPrices(supabase);
  revalidatePath(BASE);
  return { success: t.settings.saved };
}

/**
 * Premier passage (F-147, ADR 0307) : prix de l'heure et coefficient, puis bibliothèque MENAO des
 * métiers choisis (copie dans la bibliothèque de l'entreprise) ou départ depuis les devis.
 */
export async function startLibrary(_prev: FormState, formData: FormData): Promise<FormState> {
  const m = t.menao;
  const picked = text(formData, "choice");
  const choice = picked === "devis" || picked === "import" ? picked : "menao";
  const trades = [
    ...new Set(
      formData
        .getAll("trade")
        .map(String)
        .filter((c) => /^[a-z0-9-]{1,60}$/.test(c)),
    ),
  ].slice(0, 20);
  const hourPrice = euros(text(formData, "hourPrice"));
  const coefText = text(formData, "coef")?.trim() ?? "";
  const coef = coefText ? parseCoefficient(coefText) : 10_000;
  if (hourPrice === undefined || coef === null) return { error: m.invalid };
  if (choice === "menao" && hourPrice === null) return { error: m.hourRequired };
  if (choice === "menao" && trades.length === 0) return { error: m.noTrade };
  const { supabase, artisanId } = await requireTeamPermission("money");
  const { error: settingsError } = await supabase.from("artisan_pricing_settings").upsert({
    artisan_id: artisanId,
    supply_coef_bp: coef,
    ...(hourPrice === null ? {} : { hour_price_cents: hourPrice }),
  });
  if (settingsError) return { error: m.error };
  let added = 0;
  if (choice === "menao") {
    const { data, error } = await supabase.rpc("artisan_adopt_menao_library", {
      p_trade_codes: trades,
    });
    if (error) return { error: error.code === "22023" ? error.message : m.error };
    added = data ?? 0;
  } else {
    const { error } = await supabase.rpc("artisan_dismiss_menao_library");
    if (error) return { error: m.error };
  }
  await refreshWorkPrices(supabase);
  revalidatePath(BASE);
  redirect(
    (choice === "menao"
      ? `${BASE}?menao=${added}&metiers=${trades.length}`
      : choice === "import"
        ? `${BASE}/importer`
        : BASE) as Route,
  );
}

const supplySchema = z.object({
  id: z.uuid().nullable(),
  designation: z.string().trim().min(1).max(200),
  reference: z.string().trim().max(80),
  supplier: z.string().trim().max(120),
  unit: z.enum(QUOTE_UNITS),
  price: z.string(),
  priceOn: z.string(),
  waste: z.string(),
});

/** Fourniture ajoutée ou modifiée. */
export async function saveSupply(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = supplySchema.safeParse({
    id: text(formData, "id") || null,
    designation: text(formData, "designation") ?? "",
    reference: text(formData, "reference") ?? "",
    supplier: text(formData, "supplier") ?? "",
    unit: text(formData, "unit") ?? "u",
    price: text(formData, "price") ?? "",
    priceOn: text(formData, "priceOn") ?? "",
    waste: text(formData, "waste") ?? "",
  });
  const price = parsed.success ? parseEuros(parsed.data.price) : null;
  const waste =
    parsed.success && parsed.data.waste.trim() ? parseRatePercent(parsed.data.waste) : 0;
  if (!parsed.success || price === null || waste === null || waste > 5000) {
    return { error: t.supplies.invalid };
  }
  const { supabase, artisanId } = await requireTeamPermission("money");
  const row = {
    artisan_id: artisanId,
    designation: parsed.data.designation,
    reference: parsed.data.reference || null,
    supplier: parsed.data.supplier || null,
    unit: parsed.data.unit,
    purchase_price_cents: price,
    price_on: DATE.test(parsed.data.priceOn) ? parsed.data.priceOn : null,
    waste_bp: waste,
  };
  const { error } = parsed.data.id
    ? await supabase.from("artisan_supplies").update(row).eq("id", parsed.data.id)
    : await supabase.from("artisan_supplies").insert(row);
  if (error) return { error: t.supplies.invalid };
  await refreshWorkPrices(supabase);
  revalidatePath(BASE);
  return { success: t.supplies.saved };
}

/** Fourniture supprimée ; refusée si un ouvrage l'utilise (base : clé étrangère). */
export async function deleteSupply(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = z.uuid().safeParse(text(formData, "id"));
  if (!id.success) return { error: t.supplies.invalid };
  const { supabase } = await requireTeamPermission("money");
  const { error } = await supabase.from("artisan_supplies").delete().eq("id", id.data);
  if (error) return { error: error.code === "23503" ? t.supplies.inUse : t.supplies.invalid };
  revalidatePath(BASE);
  return { success: t.supplies.removed };
}

const componentSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal(COMPONENT_KINDS[0]),
    supplyId: z.uuid(),
    quantityMilli: z.number().int().min(1).max(100_000_000),
  }),
  z.object({
    kind: z.literal(COMPONENT_KINDS[1]),
    quantityMilli: z.number().int().min(1).max(100_000_000),
  }),
  z.object({
    kind: z.literal(COMPONENT_KINDS[2]),
    label: z.string().trim().min(1).max(200),
    quantityMilli: z.number().int().min(1).max(100_000_000),
    costCents: z.number().int().min(0).max(100_000_000),
  }),
]);

const workSchema = z.object({
  designation: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000),
  unit: z.enum(QUOTE_UNITS),
  lineType: z.enum(["materiel", "main_oeuvre", "autre"]),
  vatRateBp: z.union([z.literal(0), z.literal(550), z.literal(1000), z.literal(2000)]),
  detailed: z.boolean(),
  manualPriceCents: z.number().int().min(0).max(100_000_000).nullable(),
  pricePick: z.enum(PRICE_PICKS).optional(),
});

/** Prix d'achat saisis dans la composition (fournitures sans prix, F-147). */
const supplyPricesSchema = z
  .array(z.object({ supplyId: z.uuid(), priceCents: z.number().int().min(0).max(100_000_000) }))
  .max(100);

/** Ouvrage et sa composition, enregistrés d'un bloc (artisan_save_work). */
export async function saveWork(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, "id") || null;
  let raw: { work?: unknown; components?: unknown; supplyPrices?: unknown } = {};
  try {
    raw = JSON.parse(text(formData, "payload") ?? "{}") as typeof raw;
  } catch {
    raw = {};
  }
  const work = workSchema.safeParse(raw.work);
  const components = z.array(componentSchema).max(100).safeParse(raw.components);
  const supplyPrices = supplyPricesSchema.safeParse(raw.supplyPrices ?? []);
  if (
    (id && !z.uuid().safeParse(id).success) ||
    !work.success ||
    !components.success ||
    !supplyPrices.success
  ) {
    return { error: t.work.invalid };
  }
  const { supabase } = await requireTeamPermission("money");
  // Prix d'achat saisis en ligne : RLS, fournitures de l'entreprise seulement.
  for (const p of supplyPrices.data) {
    const { error } = await supabase
      .from("artisan_supplies")
      .update({ purchase_price_cents: p.priceCents, price_on: parisToday() })
      .eq("id", p.supplyId);
    if (error) return { error: t.work.error };
  }
  const { data: savedId, error } = await supabase.rpc("artisan_save_work", {
    p_work_id: id ?? undefined,
    p_work: work.data,
    p_components: components.data,
  });
  if (error || !savedId) {
    return { error: error?.code === "22023" ? error.message : t.work.error };
  }
  await refreshWorkPrices(supabase);
  revalidatePath(BASE);
  if (!id) redirect(`${BASE}/${savedId}?enregistre=1` as Route);
  revalidatePath(`${BASE}/${savedId}`);
  return { success: t.work.saved };
}

/** Ouvrage retiré de la bibliothèque (les devis gardent leurs lignes). */
export async function deleteWork(formData: FormData): Promise<void> {
  const id = z.uuid().safeParse(text(formData, "id"));
  if (!id.success) return;
  const { supabase } = await requireTeamPermission("money");
  await supabase.from("artisan_works").delete().eq("id", id.data);
  revalidatePath(BASE);
  redirect(BASE as Route);
}
