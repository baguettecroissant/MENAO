"use server";

import { IMPORT_ROLES, type ImportIssue, type ImportRole } from "@menao/core";
import { FunctionsHttpError } from "@supabase/supabase-js";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { refreshWorkPrices } from "./library";
import { requireTeamPermission } from "./space";

const BASE = "/pro/bibliotheque";
const PATH = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(xlsx|csv)$/;

export type CatalogColumn = {
  letter: string;
  title: string;
  role: ImportRole;
  recognized: boolean;
};
export type CatalogReading = {
  sheet: string | null;
  headerRow: number;
  total: number;
  tooLong: boolean;
  columns: CatalogColumn[];
  preview: string[][];
};
export type CatalogCheck = {
  fresh: number;
  existing: number;
  issues: ImportIssue[];
  issueCount: number;
  sample: { designation: string; unit: string; priceCents: number }[];
};
type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const input = z.object({
  path: z.string().regex(PATH),
  kind: z.enum(["ouvrages", "fournitures"]),
});
const mapping = input.extend({
  headerRow: z.number().int().min(-1).max(9),
  roles: z.array(z.enum(IMPORT_ROLES)).min(2).max(40),
});

/** Appel de la fonction library-import avec le jeton de l'utilisateur ; statut d'erreur lisible. */
async function invoke<T>(body: Record<string, unknown>): Promise<Result<T>> {
  const { supabase } = await requireTeamPermission("money");
  const { data, error } = await supabase.functions.invoke<{ status: string } & T>(
    "library-import",
    { method: "POST", body },
  );
  let status = data?.status ?? "generic";
  if (error instanceof FunctionsHttpError) {
    const parsed = (await error.context.json().catch(() => null)) as { status?: string } | null;
    status = parsed?.status ?? "generic";
  }
  if (status !== "ok" || !data) return { ok: false, error: status };
  return { ok: true, data };
}

/** Étape 1 → 2 (F-148, ADR 0310) : colonnes reconnues et aperçu du fichier déposé. */
export async function readCatalog(path: string, kind: string): Promise<Result<CatalogReading>> {
  const parsed = input.safeParse({ path, kind });
  if (!parsed.success) return { ok: false, error: "generic" };
  return invoke<CatalogReading>({ action: "read", ...parsed.data });
}

/** Étape 2 → 3 : lignes classées avec les colonnes choisies ; rien n'est écrit. */
export async function checkCatalog(
  path: string,
  kind: string,
  headerRow: number,
  roles: string[],
): Promise<Result<CatalogCheck>> {
  const parsed = mapping.safeParse({ path, kind, headerRow, roles });
  if (!parsed.success) return { ok: false, error: "generic" };
  return invoke<CatalogCheck>({ action: "check", ...parsed.data });
}

/** Import d'un bloc, puis retour à la bibliothèque avec le bilan. */
export async function importCatalog(
  path: string,
  kind: string,
  headerRow: number,
  roles: string[],
  updateExisting: boolean,
): Promise<Result<never>> {
  const parsed = mapping.safeParse({ path, kind, headerRow, roles });
  if (!parsed.success) return { ok: false, error: "generic" };
  const result = await invoke<{ added: number; updated: number }>({
    action: "import",
    ...parsed.data,
    updateExisting,
  });
  if (!result.ok) return result;
  const { supabase } = await requireTeamPermission("money");
  // Import fait : le premier passage de la bibliothèque est derrière (sans effet s'il l'était).
  await supabase.rpc("artisan_dismiss_menao_library");
  await refreshWorkPrices(supabase);
  revalidatePath(BASE);
  const query = new URLSearchParams({
    importe: String(result.data.added),
    maj: String(result.data.updated),
  });
  if (parsed.data.kind === "fournitures") query.set("vue", "fournitures");
  redirect(`${BASE}?${query}` as Route);
}

/** Fichier abandonné (« Changer de fichier ») : retiré de l'espace privé. */
export async function discardCatalog(path: string): Promise<void> {
  if (!PATH.test(path)) return;
  const { supabase } = await requireTeamPermission("money");
  await supabase.storage.from("library-imports").remove([path]);
}
