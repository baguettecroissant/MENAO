import type { Metadata } from "next";
import { CtaBand } from "@/components/site/cta-band";
import { PageHero } from "@/components/site/page-hero";
import { TradeTile } from "@/components/site/trade-tile";
import { fr } from "@/i18n/fr";
import { seoCatalog } from "@/lib/site/catalog";

const t = fr.home;

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `${t.tradesPage.title} — MENAO`,
  description: t.tradesSubtitle,
  alternates: { canonical: "/metiers" },
};

/**
 * Page carrefour des métiers (ADR 0264) : tous les métiers actifs, vers leurs pages, pour les
 * visiteurs et pour relier les pages locales entre elles.
 */
export default async function TradesPage() {
  const { trades } = await seoCatalog();
  return (
    <main className="bg-background">
      <PageHero
        id="metiers-title"
        eyebrow={t.tradesEyebrow}
        title={t.tradesTitle}
        subtitle={t.tradesSubtitle}
        breadcrumbs={[{ label: fr.site.home, href: "/" }, { label: t.tradesPage.breadcrumb }]}
      />
      <section className="py-14 sm:py-20">
        <ul className="mx-auto grid max-w-6xl grid-cols-1 gap-3 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
          {trades.map((trade) => (
            <li key={trade.code}>
              <TradeTile
                code={trade.code}
                label={trade.label}
                detail={fr.tradeDomains[trade.code]?.label}
                href={`/${trade.code}`}
              />
            </li>
          ))}
        </ul>
      </section>
      <CtaBand
        id="metiers-cta"
        title={fr.site.cta.title}
        text={fr.site.cta.text}
        action={{ href: "/recherche", label: fr.site.cta.action }}
        reassurance={fr.site.cta.reassurance}
      />
    </main>
  );
}
