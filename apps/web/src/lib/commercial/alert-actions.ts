"use server";

import { isCommercialPushType } from "@menao/core";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCommercialSpace } from "./space";

/** Conseiller actif hors démo (la démo n'enregistre rien). */
async function activeSpace() {
  const space = await getCommercialSpace();
  return space.active && !space.demo ? space : null;
}

/** Recevoir ou non un type de notification sur le téléphone (ADR 0396). */
export async function setPushPreference(type: string, on: boolean): Promise<void> {
  if (!isCommercialPushType(type) || typeof on !== "boolean") return;
  const space = await activeSpace();
  if (!space) return;
  await space.supabase.rpc("set_push_preference", { p_type: type, p_on: on });
}

/** « Me le rappeler dans 2 jours ». */
export async function snoozeAlert(subject: string): Promise<{ status: "ok" | "error" }> {
  if (typeof subject !== "string" || !/^(fin_essai|bloque|lien):[0-9a-f-]{36}$/.test(subject)) {
    return { status: "error" };
  }
  const space = await activeSpace();
  if (!space) return { status: "error" };
  const { error } = await space.supabase.rpc("commercial_snooze_alert", { p_subject: subject });
  if (error) return { status: "error" };
  revalidatePath("/commercial/journee");
  return { status: "ok" };
}

/** La célébration d'une prime a été vue. */
export async function markCelebrated(id: string): Promise<void> {
  if (!z.uuid().safeParse(id).success) return;
  const space = await activeSpace();
  if (!space) return;
  await space.supabase.rpc("commercial_mark_celebrated", { p_id: id });
}
