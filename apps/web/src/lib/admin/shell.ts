import "server-only";
import { parisToday, spotCheckPeriod } from "@menao/core";
import { avatarUrl } from "@/lib/chantier/storage";
import type { ShellAccount } from "@/lib/client/shell";
import type { TeamRole } from "@/lib/admin/guard";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * Coque du back-office (ADR 0035) : compte et compteurs du menu (dossiers à vérifier ; conformité :
 * renouvellements à vérifier et contrôles aléatoires du mois à faire, ADR 0283 ; tickets ouverts).
 * Lecture réservée à l'équipe (politiques RLS du staff).
 */
export async function getAdminShell(
  supabase: Client,
  userId: string,
  role: TeamRole = "admin",
): Promise<{
  account: ShellAccount;
  badges: { dossiers: number; conformite: number; tickets: number };
}> {
  const [
    { data: profile },
    { count: dossiers },
    { count: renouvellements },
    { count: controles },
    { count: tickets },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, avatar_path")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("artisans")
      .select("id", { count: "exact", head: true })
      .eq("status", "en_verification"),
    supabase
      .from("artisan_documents")
      .select("id, artisans!inner(status)", { count: "exact", head: true })
      .eq("status", "en_attente")
      .in("artisans.status", ["valide", "suspendu"]),
    supabase
      .from("artisan_spot_checks")
      .select("id", { count: "exact", head: true })
      .eq("period", spotCheckPeriod(parisToday()))
      .is("result", null),
    supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .in("status", ["ouvert", "en_cours"]),
  ]);
  return {
    account: {
      firstName: profile?.first_name ?? null,
      lastName: profile?.last_name ?? null,
      avatarUrl: avatarUrl(supabase, profile?.avatar_path),
      role,
    },
    badges: {
      dossiers: dossiers ?? 0,
      conformite: (renouvellements ?? 0) + (controles ?? 0),
      tickets: tickets ?? 0,
    },
  };
}
