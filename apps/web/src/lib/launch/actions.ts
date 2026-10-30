"use server";

import { LAUNCH_TASK_STATUSES } from "@menao/core";
import { revalidatePath } from "next/cache";
import { fr } from "@/i18n/fr";
import { text, type FormState } from "@/lib/auth/form";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const GENERIC = fr.commercialLaunch.board.toggleError;

/**
 * Tâche de lancement cochée ou rouverte (F-66, ADR 0208), depuis le tableau d'un membre : un
 * admin (session aal2) peut tout changer, un membre seulement ses propres tâches. La base vérifie
 * l'un ou l'autre (launch_set_task_status) et note qui l'a faite et quand. Formulaire sans
 * JavaScript : champs cachés `task` et `statut`.
 */
export async function setLaunchTaskStatus(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const task = text(formData, "task") ?? "";
  const statut = LAUNCH_TASK_STATUSES.find((s) => s === text(formData, "statut"));
  if (!UUID.test(task) || !statut) return { error: GENERIC };
  const supabase = await createClient();
  const { error } = await supabase.rpc("launch_set_task_status", {
    p_task: task,
    p_statut: statut,
  });
  // 22023 : règle métier (« Tâche introuvable. »), montrée telle quelle.
  if (error) return { error: error.code === "22023" ? error.message : GENERIC };
  revalidatePath("/commercial/planning");
  revalidatePath("/admin/lancement", "layout");
  return {};
}
