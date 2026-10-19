import "server-only";
import { isArtisanSlug } from "@menao/core";
import { parseArtisanProfile } from "@menao/validation";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { z } from "zod";
import { createPublicClient } from "@/lib/supabase/public";

const pageSchema = z.object({
  slug: z.string(),
  indexable: z.boolean(),
  public_company: z.string().nullable(),
});

/**
 * Fiche publique par son adresse (F-61, ADR 0144) : artisans visibles seulement. Une seule lecture
 * par rendu (métadonnées et page).
 */
export const getArtisanPage = cache(async (slug: string) => {
  if (!isArtisanSlug(slug)) return null;
  const { data } = await createPublicClient().rpc("artisan_public_page", { p_slug: slug });
  const profile = parseArtisanProfile(data);
  const page = pageSchema.safeParse(data);
  if (!profile || !page.success) return null;
  // Diffusion partielle à l'INSEE (ADR 0144) : jamais la raison sociale, ni en titre ni sur la fiche.
  const company = page.data.public_company;
  return {
    profile: { ...profile, company_name: company },
    slug: page.data.slug,
    indexable: page.data.indexable,
    name: company ?? profile.display_name,
  };
});

/** Derniers avis publiés de l'artisan (F-28). */
export async function getArtisanPageReviews(artisanId: string) {
  const { data } = await createPublicClient().rpc("artisan_public_reviews", {
    p_artisan_id: artisanId,
    p_limit: 20,
  });
  return data ?? [];
}

/** Adresses des fiches publiques : plan du site et liens des pages métier × ville. */
export const artisanPages = unstable_cache(
  async () => {
    const { data } = await createPublicClient().rpc("public_artisan_pages");
    return data ?? [];
  },
  ["artisan-pages"],
  { revalidate: 3600 },
);
