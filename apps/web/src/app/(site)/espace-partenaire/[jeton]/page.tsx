import { parsePartnerDashboard } from "@menao/validation";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PartnerSpaceView } from "@/components/partner/partner-space-view";
import { env } from "@/env";
import { fr } from "@/i18n/fr";
import { createPublicClient } from "@/lib/supabase/public";

const t = fr.partnerSpace;
const TOKEN = /^[0-9a-f]{48}$/;

export const metadata: Metadata = {
  title: t.metaTitle,
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

// Lien privé : lu à chaque visite, jamais mis en cache.
export const dynamic = "force-dynamic";

/**
 * Espace partenaire (F-59, lot 2, ADR 0139) : lu sans compte grâce au jeton du lien privé.
 * Résultats, primes, montants, liens et kit ; aucune donnée personnelle des clients ou artisans.
 */
export default async function PartnerSpacePage({
  params,
}: PageProps<"/espace-partenaire/[jeton]">) {
  const { jeton } = await params;
  if (!TOKEN.test(jeton)) notFound();
  const { data } = await createPublicClient().rpc("partner_dashboard", { p_token: jeton });
  const dashboard = parsePartnerDashboard(data);
  if (!dashboard) notFound();
  return <PartnerSpaceView dashboard={dashboard} site={env.NEXT_PUBLIC_SITE_URL} />;
}
