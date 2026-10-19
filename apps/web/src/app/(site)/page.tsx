import { ArrowRight, Signature, Wallet } from "lucide-react";
import { AppSection } from "@/components/site/app-section";
import { CtaBand } from "@/components/site/cta-band";
import { FaqJsonLd, FaqList } from "@/components/site/faq-list";
import { GuaranteeSection } from "@/components/site/guarantees";
import { HomeHero } from "@/components/site/home-hero";
import { JsonLd } from "@/components/site/json-ld";
import {
  PaymentVisual,
  ProgressVisual,
  QuoteSignVisual,
  ReceptionVisual,
  ReviewVisual,
} from "@/components/site/journey-visuals";
import { ProTeaser } from "@/components/site/pro-teaser";
import { SectionHeading } from "@/components/site/section-heading";
import { ScreenSteps } from "@/components/site/screen-steps";
import { TradeTile } from "@/components/site/trade-tile";
import { TrustSection } from "@/components/site/trust-section";
import { ButtonLink, Tag, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { seoCatalog } from "@/lib/site/catalog";
import { organizationJsonLd } from "@/lib/site/structured-data";

const t = fr.home;
const steps = fr.site.clientSteps;
const faq = fr.pages.faq;
// Trois questions parmi les plus posées, reprises de la page FAQ (les autres : « Toutes les questions »).
const HOME_FAQ = [faq.project.items[0]!, faq.trust.items[0]!, faq.payments.items[0]!];

// Page statique régénérée toutes les heures (métiers).
export const revalidate = 3600;

/**
 * Accueil (F-01) : bandeau et section confiance de la maquette « Homepage », puis le parcours en
 * quatre étapes, l'espace client, l'application, les garanties, tous les métiers, les questions fréquentes,
 * l'encart artisans et l'appel final. Aucun chiffre ni témoignage inventé.
 */
export default async function HomePage() {
  const { trades } = await seoCatalog();

  return (
    <main className="bg-surface">
      {/* Identité de MENAO pour Google et les assistants IA (ADR 0134). */}
      <JsonLd data={organizationJsonLd()} />
      <HomeHero />
      <TrustSection />

      {/* Comment ça marche */}
      <section aria-labelledby="home-steps" className="bg-background py-16 sm:py-24">
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
            screens={["clientRecherche", "clientFiche", "clientDevis", "clientSuivi"]}
          />
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

      {/* Espace client */}
      <section aria-labelledby="home-space" className="py-16 sm:py-24">
        <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 sm:px-6">
          <SectionHeading
            id="home-space"
            eyebrow={t.space.eyebrow}
            title={t.space.title}
            subtitle={t.space.subtitle}
          />
          {/* Carrousel horizontal sur mobile, grille sur grand écran (ADR 0148). */}
          <div className="reveal-group -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0 lg:pb-0">
            <article className="grid w-[85%] shrink-0 snap-center grid-cols-1 items-center gap-8 rounded-hero border border-border bg-background p-6 sm:w-[70%] sm:p-8 md:grid-cols-2 lg:col-span-2 lg:w-auto">
              <div className="flex flex-col gap-4">
                <Tag className="self-start">
                  <Signature aria-hidden="true" className="size-3.5" />
                  {fr.chantier.steps.signature}
                </Tag>
                <h3 className="text-2xl leading-tight font-medium tracking-tight text-balance">
                  {t.space.quote.title}
                </h3>
                <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
                  {t.space.quote.text}
                </p>
              </div>
              <QuoteSignVisual />
            </article>
            <article className="flex w-[85%] shrink-0 snap-center flex-col gap-6 rounded-hero bg-primary-soft p-6 sm:w-[70%] sm:p-8 lg:w-auto">
              <div className="flex flex-col gap-3">
                <span className="inline-flex items-center gap-1 self-start rounded-chip bg-surface px-2.5 py-1 text-xs font-medium text-primary-strong">
                  <Wallet aria-hidden="true" className="size-3.5" />
                  {fr.chantier.steps.paiement}
                </span>
                <h3 className="text-2xl leading-tight font-medium tracking-tight text-balance">
                  {t.space.payment.title}
                </h3>
                <p className="text-sm leading-relaxed text-pretty text-foreground/80">
                  {t.space.payment.text}
                </p>
              </div>
              <div className="mt-auto">
                <PaymentVisual />
              </div>
            </article>
            {[
              { key: "progress", visual: <ProgressVisual />, copy: t.space.progress },
              { key: "reception", visual: <ReceptionVisual />, copy: t.space.reception },
              { key: "review", visual: <ReviewVisual />, copy: t.space.review },
            ].map((card) => (
              <article
                key={card.key}
                className="flex w-[85%] shrink-0 snap-center flex-col gap-6 rounded-hero border border-border bg-background p-6 sm:w-[70%] sm:p-7 lg:w-auto"
              >
                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-medium">{card.copy.title}</h3>
                  <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
                    {card.copy.text}
                  </p>
                </div>
                <div className="mt-auto">{card.visual}</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* L'application et ses badges des stores (ADR 0150). */}
      <AppSection id="home-app" />

      <GuaranteeSection id="home-guarantees" />

      {/* Tous les métiers */}
      <section id="metiers" aria-labelledby="home-trades" className="scroll-mt-20 py-16 sm:py-24">
        <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 sm:px-6">
          <SectionHeading
            id="home-trades"
            eyebrow={t.tradesEyebrow}
            title={t.tradesTitle}
            subtitle={t.tradesSubtitle}
          />
          <ul className="reveal-group grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
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
        </div>
      </section>

      {/* Questions fréquentes */}
      <section aria-labelledby="home-faq" className="bg-background py-16 sm:py-24">
        <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 sm:px-6">
          <SectionHeading id="home-faq" eyebrow={t.faqEyebrow} title={t.faqTitle} />
          <FaqList items={HOME_FAQ} />
          <TextLink href="/faq" className="self-center text-sm">
            {t.faqMore}
          </TextLink>
        </div>
        <FaqJsonLd items={HOME_FAQ} />
      </section>

      <ProTeaser id="home-pro" />

      <CtaBand
        id="home-cta"
        title={fr.site.cta.title}
        text={fr.site.cta.text}
        action={{ href: "/recherche", label: fr.site.cta.action }}
        reassurance={fr.site.cta.reassurance}
      />
    </main>
  );
}
