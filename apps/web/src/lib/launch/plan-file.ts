import { launchPlanFileSchema, type LaunchPlanFile } from "@menao/validation";
import { z } from "zod";
import { fr } from "@/i18n/fr";

const t = fr.admin.launch.import;

/**
 * Poids maximal du plan envoyé à l'action serveur d'import, sous la limite par défaut des actions
 * serveur (1 Mo) avec une marge pour l'encodage. Un plan plus lourd est refusé avec un message clair,
 * avant l'envoi (le vrai plan pèse environ 150 Ko).
 */
export const LAUNCH_IMPORT_MAX_BYTES = 900 * 1024;

/** Compteurs renvoyés par admin_import_launch_plan (F-66, ADR 0208). */
export const launchImportResultSchema = z.object({
  members_created: z.number().int().nonnegative(),
  members_updated: z.number().int().nonnegative(),
  tasks_created: z.number().int().nonnegative(),
  tasks_updated: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
});
export type LaunchImportResult = z.infer<typeof launchImportResultSchema>;

/**
 * Fichier du plan de lancement (gardé hors du dépôt) lu puis vérifié : le plan, ou le premier
 * problème en clair, avec la ligne et le champ du fichier (« Tâche n° 4, champ « echeance » :
 * Indiquez une échéance… »).
 */
export function checkLaunchPlanFile(data: unknown): { plan: LaunchPlanFile } | { error: string } {
  const parsed = launchPlanFileSchema.safeParse(data);
  if (parsed.success) {
    const bytes = new TextEncoder().encode(JSON.stringify(parsed.data)).length;
    return bytes > LAUNCH_IMPORT_MAX_BYTES ? { error: t.errors.tooBig } : { plan: parsed.data };
  }
  const issue = parsed.error.issues[0];
  if (!issue) return { error: t.errors.read };
  const [list, index, field] = issue.path;
  const row =
    typeof index === "number" && list === "tasks"
      ? t.errors.task(index + 1)
      : typeof index === "number" && list === "members"
        ? t.errors.member(index + 1)
        : null;
  const where = row && typeof field === "string" ? t.errors.field(row, field) : row;
  return { error: t.errors.invalid(where ? `${where} : ${issue.message}` : issue.message) };
}
