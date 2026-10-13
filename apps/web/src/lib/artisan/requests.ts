import "server-only";
import { homePathForRole, roleFromAppMetadata } from "@menao/core";
import { parseRequestDetail, type RequestDetail } from "@menao/validation";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Actions de l'espace pro : artisan connecté (demandes et chantiers filtrés en base). */
export async function requireArtisan() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data || data.claims.is_anonymous) redirect("/connexion?next=/pro/demandes");
  const role = roleFromAppMetadata(data.claims.app_metadata);
  if (role !== "artisan") redirect(homePathForRole(role) as Route);
  return { supabase };
}

// Schéma partagé avec l'application (`@menao/validation`).
export { requestDetailSchema, type RequestDetail } from "@menao/validation";

export async function getRequestDetail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  requestId: string,
): Promise<RequestDetail | null> {
  const { data } = await supabase.rpc("artisan_request_detail", { p_request_id: requestId });
  return parseRequestDetail(data);
}
