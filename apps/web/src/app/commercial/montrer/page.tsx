import { partnerLinks } from "@menao/core";
import type { Metadata } from "next";
import { ShowArtisan, type ShowTab } from "@/components/commercial/field/show-artisan";
import { env } from "@/env";
import { fr } from "@/i18n/fr";
import { getCommercialSpace } from "@/lib/commercial/space";
import { qrSvg } from "@/lib/qr";
import { createPublicClient } from "@/lib/supabase/public";

export const metadata: Metadata = {
  title: `${fr.commercialField.show.label} — MENAO`,
  robots: { index: false },
};

const TABS: readonly ShowTab[] = ["demo", "calcul", "formules", "inscription"];

/**
 * « Montrer à l'artisan » (F-194, lot 83, ADR 0394) : plein écran sombre sur le téléphone du
 * conseiller, lisible en plein soleil, hors de la coque : la démo, le calcul de rentabilité, les
 * formules (lues en base) et le QR code d'inscription avec son code.
 */
export default async function ShowArtisanPage({ searchParams }: PageProps<"/commercial/montrer">) {
  const tab = (await searchParams).onglet;
  const space = await getCommercialSpace("/commercial/montrer");
  const { data: plans } = await createPublicClient()
    .from("plans")
    .select("code, nom, prix_mensuel_ht_centimes, accroche, ouverte")
    .order("ordre");
  const link =
    space.commercial && space.active
      ? partnerLinks(env.NEXT_PUBLIC_SITE_URL, space.commercial.code).pros
      : null;
  return (
    <ShowArtisan
      initialTab={TABS.find((x) => x === tab) ?? "calcul"}
      plans={(plans ?? [])
        .filter((p) => p.ouverte)
        .map((p) => ({
          code: p.code,
          nom: p.nom,
          monthlyCents: p.prix_mensuel_ht_centimes,
          accroche: p.accroche,
        }))}
      link={link}
      qr={link ? qrSvg(link) : null}
    />
  );
}
