import { artisanBadgeSvg } from "@menao/core";
import { getArtisanPage } from "@/lib/site/artisans";

/**
 * Badge « Assuré et vérifié par MENAO » (F-61, ADR 0144), affiché sur le site de l'artisan : il
 * suit l'état de la fiche (mention neutre si les documents ne sont plus à jour, rien si l'artisan
 * n'est plus visible). Gardé une heure en cache par le CDN : une fonction par heure et par badge
 * au plus, quel que soit le trafic du site qui l'affiche (spec §4.4).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ fichier: string }> }) {
  const { fichier } = await params;
  const page = fichier.endsWith(".svg") ? await getArtisanPage(fichier.slice(0, -4)) : null;
  if (!page) {
    return new Response(null, {
      status: 404,
      headers: { "cache-control": "public, max-age=300, s-maxage=3600" },
    });
  }
  return new Response(artisanBadgeSvg(page.profile.verified), {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      "x-content-type-options": "nosniff",
    },
  });
}
