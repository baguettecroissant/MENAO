import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CircleCheck, MapPin } from "lucide-react";
import { CtaBand } from "@/components/site/cta-band";
import { FaqJsonLd, FaqList } from "@/components/site/faq-list";
import { JsonLd } from "@/components/site/json-ld";
import { SectionHeading } from "@/components/site/section-heading";
import { Steps } from "@/components/site/steps";
import { TradeHero } from "@/components/site/trade-hero";
import { ButtonLink, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { seoCatalog } from "@/lib/site/catalog";
import { shareImage } from "@/lib/site/images";
import { absoluteUrl } from "@/lib/site/seo";
import { ORGANIZATION_ID, breadcrumbJsonLd } from "@/lib/site/structured-data";

const t = fr.pro.tradeLanding;
const landing = fr.pro.landing;

// Pages statiques régénérées toutes les heures (spec §4.4).
export const revalidate = 3600;
// Seuls les métiers connus au build existent : une adresse inconnue répond 404 sans requête.
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

export async function generateMetadata({ params }: PageProps<"/pro/[metier]">): Promise<Metadata> {
  const data = await load((await params).metier);
  if (!data) return {};
  const title = `${t.metaTitle(data.trade.label)} — MENAO`;
  const description = t.metaDescription(data.trade.label);
  const path = `/pro/${data.trade.code}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      type: "website",
      locale: "fr_FR",
      siteName: "MENAO",
      images: [shareImage(data.trade.code)],
    },
    twitter: { card: "summary_large_image", images: [shareImage(data.trade.code).url] },
  };
}

/**
 * Espace Pro par métier (ADR 0134) : acquisition des artisans d'un métier (« artisan plombier
 * Alpes-Maritimes »). Prestations du métier (référentiel des travaux), fonctionnement, communes
 * pilotes et questions fréquentes, avec les mêmes engagements que la page Espace Pro.
 */
export default async function ProTradePage({ params }: PageProps<"/pro/[metier]">) {
  const data = await load((await params).metier);
  if (!data) notFound();
  const { trade, communes, works } = data;
  const path = `/pro/${trade.code}`;
  const faq = t.faq(trade.label);

  return (
    <main className="bg-background">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebPage",
              name: t.title(trade.label),
              description: t.metaDescription(trade.label),
              url: absoluteUrl(path),
              inLanguage: "fr-FR",
              audience: {
                "@type": "BusinessAudience",
                audienceType: t.audience(trade.label),
              },
              publisher: { "@id": ORGANIZATION_ID },
            },
            breadcrumbJsonLd([
              { name: fr.seo.breadcrumbHome, path: "/" },
              { name: t.breadcrumb, path: "/pro" },
              { name: trade.label, path },
            ]),
          ],
        }}
      />
      <TradeHero
        id="pro-trade-title"
        code={trade.code}
        eyebrow={t.eyebrow}
        title={t.title(trade.label)}
        intro={t.subtitle(trade.label)}
        breadcrumbs={[
          { label: fr.seo.breadcrumbHome, href: "/" },
          { label: t.breadcrumb, href: "/pro" },
          { label: trade.label },
        ]}
        cta={{ href: "/pro/inscription", label: t.signUp }}
        hint={landing.hero.proofs.join(" · ")}
      />

      {works.length > 0 && (
        <section aria-labelledby="pro-trade-works" className="py-16 sm:py-24">
          <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 sm:px-6">
            <SectionHeading
              id="pro-trade-works"
              eyebrow={t.worksEyebrow}
              title={t.worksTitle(trade.label)}
              subtitle={t.worksSubtitle}
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

      <section aria-labelledby="pro-trade-steps" className="bg-surface py-16 sm:py-24">
        <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 sm:px-6">
          <SectionHeading
            id="pro-trade-steps"
            eyebrow={landing.steps.eyebrow}
            title={landing.steps.title}
            subtitle={landing.steps.subtitle}
          />
          <Steps items={landing.steps.items} />
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <ButtonLink href="/pro/inscription" size="lg">
              {t.signUp}
              <ArrowRight aria-hidden="true" className="size-4" />
            </ButtonLink>
            <ButtonLink href="/pro" variant="ghost" size="lg">
              {t.more}
            </ButtonLink>
          </div>
        </div>
      </section>

      <section aria-labelledby="pro-trade-cities" className="py-16 sm:py-24">
        <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 sm:px-6">
          <SectionHeading
            id="pro-trade-cities"
            eyebrow={t.citiesEyebrow}
            title={t.citiesTitle}
            subtitle={t.citiesSubtitle}
          />
          <ul className="flex flex-wrap justify-center gap-2.5">
            {communes.map((c) => (
              <li
                key={c.code_insee}
                className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-border bg-surface px-4 text-[0.9375rem] shadow-card"
              >
                <MapPin aria-hidden="true" className="size-4 shrink-0 text-primary" />
                {c.nom}
              </li>
            ))}
          </ul>
          <TextLink href={`/${trade.code}` as Route} className="self-center text-sm">
            {t.clientPage(trade.label)}
          </TextLink>
        </div>
      </section>

      <section aria-labelledby="pro-trade-faq" className="bg-surface py-16 sm:py-24">
        <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 sm:px-6">
          <SectionHeading
            id="pro-trade-faq"
            eyebrow={landing.faqEyebrow}
            title={t.faqTitle(trade.label)}
          />
          <FaqList items={faq} />
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/pro#formules" className="text-primary underline-offset-2 hover:underline">
              {landing.hero.plans}
            </Link>
          </p>
        </div>
        <FaqJsonLd items={faq} />
      </section>

      <CtaBand
        id="pro-trade-cta"
        title={t.ctaTitle}
        text={t.ctaText}
        action={{ href: "/pro/inscription", label: t.signUp }}
        secondary={{ href: "/pro", label: t.more }}
        reassurance={landing.finalReassurance}
      />
    </main>
  );
}
