"use server";

import { revalidatePath } from "next/cache";
import { text } from "@/lib/auth/form";
import { requireAdmin } from "./guard";

/** Paramètres réglables depuis le back-office (décisions [À VALIDER], ADR 0106). */
const KEYS = ["client_ratings_visible"] as const;

export async function setPlatformSetting(formData: FormData): Promise<void> {
  const key = text(formData, "key");
  if (!KEYS.some((k) => k === key) || !key) return;
  const { supabase } = await requireAdmin();
  await supabase.rpc("admin_set_platform_setting", {
    p_key: key,
    p_value: text(formData, "value") === "true",
  });
  revalidatePath("/admin/referentiels");
}
