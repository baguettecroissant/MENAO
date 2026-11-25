"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { text, type FormState } from "@/lib/auth/form";
import { requireAdmin } from "./guard";

const t = fr.admin.settingsPage.testCodes;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const schema = z.object({
  code: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/),
  days: z.coerce.number().int().min(1).max(90),
  uses: z.coerce.number().int().min(1).max(500),
});

const refresh = () => revalidatePath("/admin/reglages");

/** Codes d'essai de l'inscription artisan (F-192, ADR 0392). */
export async function createTestCode(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = {
    code: text(formData, "code") ?? "",
    days: text(formData, "days") ?? "",
    uses: text(formData, "uses") ?? "",
  };
  const parsed = schema.safeParse(values);
  if (!parsed.success) return { error: t.errors.invalid, values };
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_create_test_code", {
    p_code: parsed.data.code,
    p_days: parsed.data.days,
    p_max_uses: parsed.data.uses,
  });
  if (error) {
    return { error: error.code === "23505" ? t.errors.taken : t.errors.generic, values };
  }
  refresh();
  return { success: t.created };
}

export async function disableTestCode(formData: FormData): Promise<void> {
  const id = formData.get("id");
  if (typeof id !== "string" || !UUID.test(id)) return;
  const { supabase } = await requireAdmin();
  await supabase.rpc("admin_disable_test_code", { p_id: id });
  refresh();
}

export async function deleteTestAccount(formData: FormData): Promise<void> {
  const id = formData.get("id");
  if (typeof id !== "string" || !UUID.test(id)) return;
  const { supabase } = await requireAdmin();
  await supabase.rpc("admin_delete_test_account", { p_artisan_id: id });
  refresh();
}
