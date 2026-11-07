import {
  parseTeam,
  parseTeamContext,
  type Team,
  type TeamContext,
  type TeamRole,
} from "@menao/core";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "./supabase";

/**
 * Comptes d'équipe (F-89, ADR 0240), comme sur le site : le patron (titulaire de la fiche) ou un
 * membre actif de son équipe travaille sur la fiche de l'entreprise. Contexte gardé quelques
 * minutes par compte (la base revérifie chaque accès).
 */
const TTL_MS = 5 * 60 * 1000;
let cached: { userId: string; at: number; context: TeamContext | null } | null = null;

export async function myTeamContext(): Promise<TeamContext | null> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) return null;
  if (cached && cached.userId === userId && Date.now() - cached.at < TTL_MS) return cached.context;
  const { data, error } = await supabase.rpc("my_team_context");
  if (error) return null;
  const context = parseTeamContext(data);
  cached = { userId, at: Date.now(), context };
  return context;
}

/** Identifiant à filtrer : la fiche de l'entreprise, ou un identifiant nul qui ne trouve rien. */
const NO_ARTISAN = "00000000-0000-0000-0000-000000000000";
export async function myArtisanKey(): Promise<string> {
  return (await myTeamContext())?.artisanId ?? NO_ARTISAN;
}

/** « Mon équipe » du patron ; null pour un membre ou en cas d'erreur. */
export async function loadTeam(): Promise<Team | null> {
  const { data, error } = await supabase.rpc("my_team");
  return error ? null : parseTeam(data);
}

async function invokeTeam(body: Record<string, unknown>): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ status: string }>("team-members", {
    body,
  });
  if (error instanceof FunctionsHttpError) {
    const parsed = (await error.context.json().catch(() => null)) as { status?: string } | null;
    return parsed?.status ?? "unavailable";
  }
  return data?.status ?? "unavailable";
}

/** Invitation par e-mail (Edge Function team-members) ; renvoie le statut (« ok » ou l'erreur). */
export function inviteTeamMember(invite: {
  firstName: string;
  lastName: string;
  email: string;
  role: TeamRole;
}): Promise<string> {
  return invokeTeam({ action: "invite", ...invite });
}

export function removeTeamMember(userId: string): Promise<string> {
  return invokeTeam({ action: "remove", userId });
}

/** Rôle, suspension ou réactivation ; renvoie le message de refus de la base, sinon null. */
export async function updateTeamMember(
  userId: string,
  change: { role: TeamRole } | { active: boolean },
): Promise<string | null> {
  const { error } =
    "role" in change
      ? await supabase.rpc("set_team_member_role", { p_user_id: userId, p_role: change.role })
      : await supabase.rpc("set_team_member_active", {
          p_user_id: userId,
          p_active: change.active,
        });
  if (!error) return null;
  return error.code === "22023" || error.code === "42501" ? error.message : "";
}
