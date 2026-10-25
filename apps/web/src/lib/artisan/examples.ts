import "server-only";
import {
  examplePhotoKey,
  homePathForRole,
  roleFromAppMetadata,
  type ExamplePhoto,
} from "@menao/core";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** Pages d'exemples de l'espace pro (ADR 0184). */
export const EXAMPLES_BASE = "/pro/decouvrir";

const PHOTOS: Record<ExamplePhoto, string> = {
  carrelage: "/images/metiers/carreleur-400.webp",
  plomberie: "/images/metiers/plombier-400.webp",
  chauffage: "/images/metiers/chauffagiste-400.webp",
};

/** Image fournie avec le site pour une photo d'exemple (`exemple/…`). */
export function examplePhotoUrl(path: string): string | null {
  const key = examplePhotoKey(path);
  return key ? PHOTOS[key] : null;
}

/**
 * Visiteur des exemples : tout compte artisan, dossier en cours, en vérification ou validé.
 * Aucune donnée de la base n'est montrée, seulement le compte (coque) et l'état du dossier.
 */
export const requireExampleViewer = cache(async () => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth || auth.claims.is_anonymous) redirect("/connexion?next=/pro/decouvrir");
  const role = roleFromAppMetadata(auth.claims.app_metadata);
  if (role !== "artisan" && role !== "artisan_en_attente") {
    redirect(homePathForRole(role) as Route);
  }
  const [{ data: profile }, { data: artisan }] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, avatar_path")
      .eq("user_id", auth.claims.sub)
      .maybeSingle(),
    supabase.from("artisans").select("status").eq("user_id", auth.claims.sub).maybeSingle(),
  ]);
  return {
    firstName: profile?.first_name ?? null,
    account: {
      firstName: profile?.first_name ?? null,
      lastName: profile?.last_name ?? null,
      avatarUrl: profile?.avatar_path
        ? supabase.storage.from("avatars").getPublicUrl(profile.avatar_path).data.publicUrl
        : null,
      role,
    },
    // Validé (ou suspendu, radié) : l'espace pro est ouvert, le bandeau y ramène.
    validated:
      role === "artisan" &&
      (artisan?.status === "valide" ||
        artisan?.status === "suspendu" ||
        artisan?.status === "radie"),
  };
});
