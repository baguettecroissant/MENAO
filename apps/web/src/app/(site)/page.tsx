import { ArrowRight } from "lucide-react";
import { AppBand } from "@/components/site/app-band";
import { CtaBand } from "@/components/site/cta-band";
import { FaqJsonLd, FaqList } from "@/components/site/faq-list";
import { GuaranteeSection } from "@/components/site/guarantees";
import { HomeHero } from "@/components/site/home-hero";
import { HomeProofs } from "@/components/site/home-proofs";
import { HomeTrades } from "@/components/site/home-trades";
import { HomeVideo } from "@/components/site/home-video";
import { JsonLd } from "@/components/site/json-ld";
import { ProTeaser } from "@/components/site/pro-teaser";
import { SectionHeading } from "@/components/site/section-heading";
import { ScreenSteps } from "@/components/site/screen-steps";
import { SiteAssistantBubble } from "@/components/site/site-assistant-bubble";
import { ZoneSection } from "@/components/site/zone-section";
import { ButtonLink, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { seoCatalog } from "@/lib/site/catalog";
import { organizationJsonLd } from "@/lib/site/structured-data";
import { createPublicClient } from "@/lib/supabase/public";

const t = fr.home;
const steps = fr.site.clientSteps;
const faq = fr.pages.faq;
// Questions sur les objections (ADR 0264) : gratuité, nombre d'artisans, coordonnées, contrôle,
// paiement, commission.
const HOME_FAQ = [
  faq.project.items[0]!,
  faq.project.items[1]!,
  faq.project.items[2]!,
  faq.trust.items[0]!,
  faq.payments.items[0]!,
  faq.payments.items[1]!,
];
const CONTROLS = fr.pages.guarantees.checks.map((check) => check.title);

export const revalidate = 3600;

/**
 * Accueil (F-01), nouvelle structure du 9 novembre 2026 (ADR 0264) : bandeau et recherche, preuves,
 * métiers, comment ça marche avec la vidéo (ADR 0278) et l'application, garanties et contrôles,
 * zone couverte, questions fréquentes, encart artisans et appel final. Aucun chiffre ni témoignage
 * inventé.
 */
export default async function HomePage() {
  const [{ trades, communes }, { data: plans }] = await Promise.all([
    seoCatalog(),
    createPublicClient()
      .from("plans")
      .select("nom, prix_mensuel_ht_centimes, ouverte")
      .order("ordre"),
  ]);
  const entry = plans?.find((plan) => plan.ouverte) ?? null;

  return (
    <main className="bg-surface">
      {/* Identité de MENAO pour Google et les assistants IA (ADR 0134). */}
      <JsonLd data={organizationJsonLd()} />
      <HomeHero />
      <HomeProofs />
      <HomeTrades trades={trades} />

      {/* Comment ça marche, puis l'application (ADR 0264). */}
      <section
        aria-labelledby="home-steps"
        className="border-y border-border bg-background py-16 sm:py-24"
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 sm:px-6">
          <SectionHeading
            id="home-steps"
            eyebrow={steps.eyebrow}
            title={steps.title}
            subtitle={steps.subtitle}
          />
          {/* Chaque étape illustrée par l'écran correspondant de l'application (ADR 0147). */}
          <ScreenSteps
            items={steps.items}
            screens={["clientRecherche", "clientArtisans", "clientDevis", "clientSuivi"]}
          />
          {/* Le même parcours en vidéo, pour ceux qui hésitent encore (ADR 0278). */}
          <HomeVideo />
          <AppBand id="home-app" />
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
            <ButtonLink href="/recherche" size="lg">
              {steps.cta}
              <ArrowRight aria-hidden="true" className="size-4" />
            </ButtonLink>
            <ButtonLink href="/comment-ca-marche" variant="secondary" size="lg">
              {steps.more}
            </ButtonLink>
          </div>
        </div>
      </section>

      <div className="bg-surface">
        <GuaranteeSection id="home-guarantees" tone="light" controls={CONTROLS} />
      </div>

      <ZoneSection id="home-zone" communes={communes} />

      {/* Questions fréquentes */}
      <section aria-labelledby="home-faq" className="bg-surface py-16 sm:py-24">
        <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 sm:px-6">
          <SectionHeading id="home-faq" eyebrow={t.faqEyebrow} title={t.faqTitle} />
          <FaqList items={HOME_FAQ} />
          <TextLink href="/faq" className="self-center text-sm">
            {t.faqMore}
          </TextLink>
        </div>
        <FaqJsonLd items={HOME_FAQ} />
      </section>

      <ProTeaser
        id="home-pro"
        price={entry ? { cents: entry.prix_mensuel_ht_centimes, plan: entry.nom } : null}
      />

      <CtaBand
        id="home-cta"
        title={fr.site.cta.title}
        text={fr.site.cta.text}
        action={{ href: "/recherche", label: fr.site.cta.action }}
        reassurance={fr.site.cta.reassurance}
        photo={{ scene: "camillePortrait", position: "22% 30%" }}
      />
      <SiteAssistantBubble />
    </main>
  );
}
