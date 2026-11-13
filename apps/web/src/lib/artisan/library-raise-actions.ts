"use server";

import { RAISE_ROUNDINGS, parseRaise } from "@menao/core";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { text, type FormState } from "@/lib/auth/form";
import { refreshWorkPrices } from "./library";
import { requireTeamPermission } from "./space";

const t = fr.pro.library.raise;
const BASE = "/pro/bibliotheque";

/**
 * Hausse en un geste (F-149, ADR 0312) : calculée et enregistrée par la base (prix d'avant
 * gardés pour l'annulation), puis prix des ouvrages recalculés et retour à la bibliothèque.
 */
export async function raisePrices(_prev: FormState, formData: FormData): Promise<FormState> {
  const rateBp = parseRaise(text(formData, "rate") ?? "");
  const rounding = z.enum(RAISE_ROUNDINGS).safeParse(text(formData, "rounding"));
  const works = formData.get("works") === "on";
  const supplies = formData.get("supplies") === "on";
  if (rateBp === null || !rounding.success || !(works || supplies)) return { error: t.invalid };
  const { supabase } = await requireTeamPermission("money");
  const { data, error } = await supabase.rpc("artisan_raise_prices", {
    p_rate_bp: rateBp,
    p_rounding: rounding.data,
    p_works: works,
    p_supplies: supplies,
  });
  if (error || !data) return { error: t.failed };
  await refreshWorkPrices(supabase);
  revalidatePath(BASE);
  redirect(`${BASE}${supplies && !works ? "?vue=fournitures" : ""}` as Route);
}

/** Annulation de la dernière hausse, dans les 24 h. */
export async function undoRaise(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = z.string().uuid().safeParse(text(formData, "raiseId"));
  if (!id.success) return { error: t.undoFailed };
  const { supabase } = await requireTeamPermission("money");
  const { data, error } = await supabase.rpc("artisan_undo_price_raise", { p_raise_id: id.data });
  if (error || data === null) return { error: t.undoFailed };
  await refreshWorkPrices(supabase);
  revalidatePath(BASE);
  redirect(`${BASE}?annule=${data}` as Route);
}
