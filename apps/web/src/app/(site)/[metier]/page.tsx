import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BriefcaseBusiness, ChevronRight, CircleCheck, MapPin } from "lucide-react";
import { CtaBand } from "@/components/site/cta-band";
import { FaqJsonLd, FaqList } from "@/components/site/faq-list";
import { GuaranteeSection } from "@/components/site/guarantees";
import { JsonLd } from "@/components/site/json-ld";
import { SectionHeading } from "@/components/site/section-heading";
import { Steps } from "@/components/site/steps";
import { TradeHero } from "@/components/site/trade-hero";
import { fr } from "@/i18n/fr";
import { seoCatalog } from "@/lib/site/catalog";
import { shareImage } from "@/lib/site/images";
import { absoluteUrl } from "@/lib/site/seo";
import { ORGANIZATION_ID, breadcrumbJsonLd } from "@/lib/site/structured-data";

const t = fr.seo;
const steps = fr.site.clientSteps;

// Pages statiques régénérées toutes les heures (spec §4.4).
export const revalidate = 3600;
// Seules les pages générées au build existent : une adresse inconnue répond 404 tout de suite,
// sans fonction ni requête à la base (robots, coût d'hébergement, spec §4.4).
export const dynamicParams = false;

export async function generateStaticParams() {
  const { trades } = await seoCatalog();
  return trades.map((tr) => ({ metier: tr.code }));
}

async function load(metier: string) {
  const { trades, communes, workTypes } = await seoCatalog();
  const trade = trades.find((tr) => tr.code === metier);
  if (!trade) return null;
  return { trade, communes, works: workTypes.filter((w) => w.trade_code === trade.code) };
}

export async function generateMetadata({ params }: PageProps<"/[metier]">): Promise<Metadata> {
  const data = await load((await params).metier);
  if (!data) return {};
  const title = `${t.tradeTitle(data.trade.label)} — MENAO`;
  const description = t.tradeMetaDescription(data.trade.label);
  return {
    title,
    description,
    alternates: { canonical: `/${data.trade.code}` },
    openGraph: {
      title,
      description,
      url: `/${data.trade.code}`,
      type: "website",
      locale: "fr_FR",
      siteName: "MENAO",
      // Image du métier (le partage des pages d'un métier montre ce métier).
      images: [shareImage(data.trade.code)],
    },
    twitter: { card: "summary_large_image", images: [shareImage(data.trade.code).url] },
  };
}

/**
 * Page métier (F-02) : prestations du métier (référentiel des travaux), communes pilotes vers les
 * pages métier × ville, fonctionnement, garanties et questions fréquentes.
 */
export default async function TradePage({ params }: PageProps<"/[metier]">) {
  const data = await load((await params).metier);
  if (!data) notFound();
  const { trade, communes, works } = data;
  const domain = fr.tradeDomains[trade.code]?.label ?? trade.label;
  const searchHref = `/recherche?metier=${trade.code}`;
  const faq = t.tradeFaq(trade.label);

  return (
    <main className="bg-background">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Service",
              name: t.tradeTitle(trade.label),
              serviceType: trade.label,
              areaServed: { "@type": "AdministrativeArea", name: fr.structuredData.area },
              provider: { "@type": "Organization", "@id": ORGANIZATION_ID, name: fr.meta.name },
              url: absoluteUrl(`/${trade.code}`),
            },
            breadcrumbJsonLd([
              { name: t.breadcrumbHome, path: "/" },
              { name: trade.label, path: `/${trade.code}` },
            ]),
          ],
        }}
      />
      <TradeHero
        id="trade-title"
        code={trade.code}
        eyebrow={t.tradeEyebrow}
        title={t.tradeTitle(trade.label)}
        intro={t.tradeIntro(trade.label)}
        breadcrumbs={[{ label: t.breadcrumbHome, href: "/" }, { label: trade.label }]}
        cta={{ href: searchHref, label: t.cta }}
        hint={t.ctaHint}
      />

      {works.length > 0 && (
        <section aria-labelledby="trade-works" className="py-16 sm:py-24">
          <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 sm:px-6">
            <SectionHeading
              id="trade-works"
              eyebrow={domain}
              title={t.workTitle(domain)}
              subtitle={t.workSubtitle}
            />
            <ul className="flex flex-wrap justify-center gap-2.5">
              {works.map((work) => (
                <li
                  key={work.code}
                  className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-border bg-surface px-4 text-[0.9375rem] shadow-card"
                >
                  <CircleCheck aria-hidden="true" className="size-4 shrink-0 text-primary" />
                  {work.label}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section aria-labelledby="trade-cities" className="bg-surface py-16 sm:py-24">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 sm:px-6">
          <SectionHeading
            id="trade-cities"
            eyebrow={t.tradeEyebrow}
            title={t.citiesTitle(trade.label)}
            subtitle={t.citiesSubtitle}
          />
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {communes.map((c) => (
              <li key={c.code_insee}>
                <Link
                  href={`/${trade.code}/${c.slug}` as Route}
                  className="group flex items-center gap-3 rounded-card border border-border bg-background px-4 py-3.5 transition hover:border-primary/40 hover:bg-surface hover:shadow-raised focus-visible:ring-4 focus-visible:ring-primary/25 focus-visible:outline-none"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-primary shadow-card">
                    <MapPin aria-hidden="true" className="size-4" />
                  </span>
                  <span className="flex-1 font-medium">{t.cityTitle(trade.label, c.nom)}</span>
                  <ChevronRight
                    aria-hidden="true"
                    className="size-4 text-subtle-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="trade-steps" className="py-16 sm:py-24">
        <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 sm:px-6">
          <SectionHeading
            id="trade-steps"
            eyebrow={steps.eyebrow}
            title={steps.title}
            subtitle={steps.subtitle}
          />
          <Steps items={steps.items} />
        </div>
      </section>

      <div className="bg-surface">
        <GuaranteeSection id="trade-guarantees" tone="light" />
      </div>

      <section aria-labelledby="trade-faq" className="py-16 sm:py-24">
        <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 sm:px-6">
          <SectionHeading id="trade-faq" eyebrow={fr.home.faqEyebrow} title={fr.home.faqTitle} />
          <FaqList items={faq} />
          <Link
            href={`/pro/${trade.code}` as Route}
            className="group flex items-center gap-4 rounded-card border border-primary-soft bg-primary-softer px-5 py-4 transition hover:border-primary/40 hover:shadow-raised focus-visible:ring-4 focus-visible:ring-primary/25 focus-visible:outline-none"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface text-primary shadow-card">
              <BriefcaseBusiness aria-hidden="true" className="size-5" />
            </span>
            <span className="flex-1 text-[0.9375rem] font-medium">
              {fr.pro.tradeLanding.proTeaser(trade.label)}
            </span>
            <ArrowRight
              aria-hidden="true"
              className="size-4 text-primary transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>
        <FaqJsonLd items={faq} />
      </section>

      <CtaBand
        id="trade-cta"
        title={fr.site.cta.title}
        text={fr.site.cta.text}
        action={{ href: searchHref, label: fr.site.cta.action }}
        reassurance={fr.site.cta.reassurance}
      />
    </main>
  );
}
