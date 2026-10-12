import "server-only";
import { z } from "zod";
import type { createClient } from "@/lib/supabase/server";
import { PAGE_SIZE } from "./follow-up";

type Client = Awaited<ReturnType<typeof createClient>>;

/** Filtres de la liste des personnes (F-52, ADR 0047) : rôle calculé par la base. */
export const PEOPLE_FILTERS = ["tous", "particuliers", "artisans", "equipe"] as const;
export type PeopleFilter = (typeof PEOPLE_FILTERS)[number];

export function parsePeopleFilter(value: unknown): PeopleFilter {
  return typeof value === "string" && (PEOPLE_FILTERS as readonly string[]).includes(value)
    ? (value as PeopleFilter)
    : "tous";
}

const counts = z.record(z.string(), z.number().int().nonnegative());

export async function listPeople(
  supabase: Client,
  { filter, query, page }: { filter: PeopleFilter; query: string | null; page: number },
) {
  const { data } = await supabase.rpc("admin_people", {
    p_role: filter,
    p_query: query ?? undefined,
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });
  const rows = data ?? [];
  return { rows, total: rows[0]?.total ?? 0 };
}

export async function peopleCounts(supabase: Client, query: string | null) {
  const { data } = await supabase.rpc("admin_people_counts", { p_query: query ?? undefined });
  const parsed = counts.safeParse(data);
  return parsed.success ? parsed.data : {};
}

/** Recherche globale de la barre du haut : résultats regroupés par type. */
export async function searchEverything(supabase: Client, query: string) {
  const { data } = await supabase.rpc("admin_search", { p_query: query, p_limit: 8 });
  return data ?? [];
}

const accountSchema = z.object({
  email: z.string().nullable(),
  created_at: z.string(),
  last_sign_in_at: z.string().nullable(),
  email_confirmed_at: z.string().nullable(),
  banned_until: z.string().nullable(),
});

export async function getPersonDetail(supabase: Client, userId: string) {
  const [{ data: profile }, { data: account }] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, phone, role, marketing_opt_in")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.rpc("admin_user_account", { p_user_id: userId }),
  ]);
  const parsedAccount = accountSchema.safeParse(account);
  if (!profile || !parsedAccount.success) return null;
  const [projects, chantiers, tickets, reviews, artisan] = await Promise.all([
    supabase
      .from("projects")
      .select("id, created_at, status, ville_nom, trades(label)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("chantiers")
      .select("id, title, status, created_at")
      .eq("particulier_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("tickets")
      .select("id, type, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("reviews")
      .select("id, score, status, created_at, artisans(raison_sociale, nom_commercial)")
      .eq("particulier_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("artisans").select("id").eq("user_id", userId).maybeSingle(),
  ]);
  const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
  return {
    name: name || null,
    profile,
    account: parsedAccount.data,
    artisanId: artisan.data?.id ?? null,
    projects: projects.data ?? [],
    chantiers: chantiers.data ?? [],
    tickets: tickets.data ?? [],
    reviews: reviews.data ?? [],
  };
}

const activitySchema = z.object({
  demandes: z.object({
    total: z.number(),
    en_attente: z.number(),
    acceptees: z.number(),
    refusees: z.number(),
    expirees: z.number(),
    annulees: z.number(),
  }),
  chantiers: z.record(z.string(), z.number()),
  avis: z.object({ publies: z.number(), note_moyenne: z.number().nullable() }),
});
export type ArtisanActivity = z.infer<typeof activitySchema>;

export async function getArtisanActivity(
  supabase: Client,
  artisanId: string,
): Promise<ArtisanActivity | null> {
  const { data } = await supabase.rpc("admin_artisan_activity", { p_artisan_id: artisanId });
  const parsed = activitySchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}
