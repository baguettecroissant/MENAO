import "server-only";
import type { Database } from "@menao/db";
import type { createClient } from "@/lib/supabase/server";
import { toLaunchBoardTask, type LaunchBoardTask } from "@/lib/launch/board";

type Client = Awaited<ReturnType<typeof createClient>>;
type MemberRow = Database["public"]["Tables"]["launch_members"]["Row"];
type TaskRow = Database["public"]["Tables"]["launch_tasks"]["Row"];

export type LaunchMember = Pick<
  MemberRow,
  "id" | "nom" | "mission" | "kind" | "user_id" | "objectif_valides" | "ordre" | "active"
>;
export type LaunchTask = Pick<
  TaskRow,
  | "id"
  | "member_id"
  | "titre"
  | "detail"
  | "phase"
  | "categorie"
  | "debut"
  | "echeance"
  | "recurrence"
  | "jalon"
  | "partage"
  | "statut"
>;
/** Tâche du back-office : celle du tableau, avec son responsable (null : toute l'équipe). */
export type LaunchTeamTask = LaunchBoardTask & { member_id: string | null };

const MEMBER_COLUMNS = "id, nom, mission, kind, user_id, objectif_valides, ordre, active";
// Droits par colonne en base : ni fait_par, ni created_by, ni ref ne sont lisibles par l'API.
const TASK_COLUMNS =
  "id, member_id, titre, detail, phase, categorie, debut, echeance, recurrence, jalon, partage, statut";
/** Lignes renvoyées au plus par appel à l'API (max_rows) ; un plan compte 2 000 tâches au plus. */
const PAGE = 1000;
const MAX_PAGES = 5;

/** Équipe de lancement (F-66, ADR 0208), dans l'ordre d'affichage. Lecture admin (RLS). */
export async function listLaunchMembers(supabase: Client): Promise<LaunchMember[]> {
  const { data } = await supabase
    .from("launch_members")
    .select(MEMBER_COLUMNS)
    .order("ordre")
    .order("nom");
  return data ?? [];
}

export async function getLaunchMember(supabase: Client, id: string): Promise<LaunchMember | null> {
  const { data } = await supabase
    .from("launch_members")
    .select(MEMBER_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  return data;
}

/**
 * Tâches de lancement, page après page (l'API en renvoie 1 000 au plus par appel) : toutes, ou
 * celles d'un membre avec les tâches partagées avec toute l'équipe (ce que le membre voit).
 */
async function listTasks(supabase: Client, memberId?: string): Promise<LaunchTask[]> {
  const rows: LaunchTask[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    let query = supabase.from("launch_tasks").select(TASK_COLUMNS);
    if (memberId) query = query.or(`member_id.eq.${memberId},partage.eq.true`);
    const { data } = await query
      .order("echeance", { ascending: true, nullsFirst: false })
      .order("ordre")
      .order("titre")
      .order("id")
      .range(page * PAGE, page * PAGE + PAGE - 1);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

/** Toutes les tâches de l'équipe, chacune avec son responsable. */
export async function listLaunchTeamTasks(supabase: Client): Promise<LaunchTeamTask[]> {
  const rows = await listTasks(supabase);
  return rows.map((row) => ({ ...toLaunchBoardTask(row, null), member_id: row.member_id }));
}

/** Tableau d'un membre : ses tâches (à lui) et celles partagées avec toute l'équipe. */
export async function listLaunchMemberTasks(
  supabase: Client,
  memberId: string,
): Promise<LaunchBoardTask[]> {
  const rows = await listTasks(supabase, memberId);
  return rows.map((row) => toLaunchBoardTask(row, memberId));
}

export async function getLaunchTask(supabase: Client, id: string): Promise<LaunchTask | null> {
  const { data } = await supabase
    .from("launch_tasks")
    .select(TASK_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  return data;
}

/** Comptes reliables à un membre : admins et commerciaux, avec le membre déjà relié éventuel. */
export async function listLaunchAccounts(supabase: Client) {
  const { data } = await supabase.rpc("admin_launch_accounts");
  return data ?? [];
}
export type LaunchAccount = Awaited<ReturnType<typeof listLaunchAccounts>>[number];
