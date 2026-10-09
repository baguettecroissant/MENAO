import "server-only";
import { homePathForRole, roleFromAppMetadata } from "@menao/core";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/** Espace « Mes demandes » : artisans validés uniquement (les demandes sont filtrées en base). */
export async function requireArtisan() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data || data.claims.is_anonymous) redirect("/connexion?next=/pro/demandes");
  const role = roleFromAppMetadata(data.claims.app_metadata);
  if (role !== "artisan") redirect(homePathForRole(role) as Route);
  return { supabase };
}

const detailSchema = z.object({
  id: z.string(),
  status: z.enum(["envoyee", "acceptee", "refusee", "expiree", "annulee"]),
  created_at: z.string(),
  expires_at: z.string(),
  refusal_reason: z.string().nullable(),
  callback_mode: z.enum(["des_que_possible", "plage"]),
  callback_from: z.string().nullable(),
  callback_to: z.string().nullable(),
  message: z.string().nullable(),
  description: z.string(),
  summary: z.string().nullable(),
  trade: z.string().nullable(),
  lieu_type: z.enum(["appartement", "maison", "jardin", "entreprise"]).nullable(),
  surface: z.enum(["moins_10", "10_20", "20_50", "plus_50"]).nullable(),
  rooms: z.array(z.string()),
  work_types: z.array(z.string()),
  urgence: z.boolean(),
  date_mode: z.enum(["des_que_possible", "date", "inconnue"]),
  date_souhaitee: z.string().nullable(),
  ville_nom: z.string().nullable(),
  code_postal: z.string().nullable(),
  adresse: z.string().nullable(),
  lat: z.number().nullable(),
  lon: z.number().nullable(),
  photos: z.array(z.string()),
  client: z.object({
    first_name: z.string().nullable(),
    last_name: z.string().nullable(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
  }),
});
export type RequestDetail = z.infer<typeof detailSchema>;

export async function getRequestDetail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  requestId: string,
): Promise<RequestDetail | null> {
  const { data } = await supabase.rpc("artisan_request_detail", { p_request_id: requestId });
  const parsed = detailSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}
