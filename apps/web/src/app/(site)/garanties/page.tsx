import type { Metadata } from "next";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  CircleCheck,
  EyeOff,
  FileText,
  Phone,
  Scale,
  ShieldCheck,
  Sparkles,
  Umbrella,
  UserCheck,
} from "lucide-react";
import { CtaBand } from "@/components/site/cta-band";
import { PhoneMockup } from "@/components/site/device-mockups";
import { CheckLine, IconRow, NumberedSteps } from "@/components/site/info-blocks";
import { PageHero } from "@/components/site/page-hero";
import { ScenePhoto } from "@/components/site/scene-photo";
import { SectionHeading } from "@/components/site/section-heading";
import { PaymentFlow, VerificationCard } from "@/components/site/trust-visuals";
import { ButtonLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { APP_SCREENS } from "@/lib/site/app-screens";
import { SiteAssistantBubble } from "@/components/site/site-assistant-bubble";

const t = fr.pages.guarantees;
const m = fr.site.mockups;
const CHECK_ICONS = [Building2, FileText, ShieldCheck, Umbrella, UserCheck];
const DATA_ICONS = [Phone, Sparkles, EyeOff];

export const metadata: Metadata = {
  title: `${t.title} — MENAO`,
  description: t.metaDescription,
  alternates: { canonical: "/garanties" },
};

/**
 * Garanties & Confiance (F-03, refonte ADR 0276) : contrôles des artisans, paiements directs, avis
 * vérifiés, données personnelles, recours en cas de problème et classement, avec les photos de
 * Julien et de Camille et les vrais écrans de l'application.
 */
export default function GuaranteesPage() {
  return (
    <main className="bg-background">
      <PageHero
        id="guarantees-title"
        eyebrow={t.eyebrow}
        title={t.heroTitle}
        accent={t.heroAccent}
        subtitle={t.intro}
        breadcrumbs={[{ label: fr.site.home, href: "/" }, { label: t.title }]}
        actions={
          <ButtonLink href="/recherche" variant="secondary" size="lg" className="border-white">
            {t.cta}
            <ArrowRight aria-hidden="true" className="size-4" />
          </ButtonLink>
        }
        photo={{ scene: "julienPortrait", position: "70% 25%" }}
        overlay={
          // Le dossier vérifié, posé sur le portrait de l'artisan : sous le texte sur mobile, masqué
          // entre 1024 et 1279 px, où il recouvrirait le texte ou le visage.
          <div className="relative mx-auto mt-10 w-full max-w-sm lg:hidden xl:absolute xl:right-[21%] xl:bottom-10 xl:mx-0 xl:mt-0 xl:block xl:w-[22rem]">
            <VerificationCard />
          </div>
        }
      />

      {/* Artisans vérifiés : les contrôles, et la vraie fiche d'un artisan dans l'application. */}
      <section aria-labelledby="guarantees-checks" className="py-16 sm:py-24">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)] lg:gap-16">
          <div className="flex flex-col gap-7">
            <SectionHeading
              id="guarantees-checks"
              eyebrow={t.checksEyebrow}
              title={t.checksTitle}
              subtitle={t.checksSubtitle}
              align="left"
            />
            <ul className="flex flex-col gap-5">
              {t.checks.map((check, i) => (
                <IconRow
                  key={check.title}
                  icon={CHECK_ICONS[i] ?? ShieldCheck}
                  title={check.title}
                  text={check.text}
                />
              ))}
            </ul>
            <p className="flex items-start gap-3 rounded-card bg-primary-soft px-5 py-4 text-[0.9375rem] text-primary-strong">
              <CalendarClock aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
              {t.expiry}
            </p>
          </div>
          <div className="relative mx-auto flex h-[32rem] w-full max-w-[25rem] justify-center overflow-hidden rounded-hero bg-primary-soft pt-12 sm:h-[38rem]">
            <span className="absolute top-4 left-4 z-10 rounded-pill bg-surface px-3 py-1 text-xs font-medium text-primary-strong shadow-card">
              {m.example}
            </span>
            <div className="w-[16.5rem] sm:w-[18rem]">
              <PhoneMockup screen={APP_SCREENS.clientFiche} alt={m.screens.clientFiche} />
            </div>
          </div>
        </div>
      </section>

      {/* Paiements : le trajet de l'argent, et l'écran de l'acompte. */}
      <section aria-labelledby="guarantees-payment" className="px-2 sm:px-4">
        <div className="mx-auto max-w-[1440px] overflow-hidden rounded-hero bg-[linear-gradient(150deg,#0b1438_0%,#16236e_60%,#2a3fb8_100%)] px-6 py-16 text-white sm:px-12 sm:py-20">
          <div className="mx-auto flex max-w-6xl flex-col gap-12">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-14">
              <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-4">
                  <SectionHeading
                    id="guarantees-payment"
                    eyebrow={t.paymentEyebrow}
                    title={t.paymentTitle}
                    align="left"
                    tone="inverse"
                  />
                  <p className="max-w-2xl text-pretty text-white/80 sm:text-lg">{t.paymentText}</p>
                </div>
                <PaymentFlow />
              </div>
              <div className="hidden h-[27rem] self-end overflow-hidden lg:block">
                <PhoneMockup screen={APP_SCREENS.clientAcompte} alt={m.screens.clientAcompte} />
              </div>
            </div>
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {t.paymentSteps.map((step) => (
                <li
                  key={step.title}
                  className="flex flex-col gap-2 rounded-[1.375rem] border border-white/10 bg-white/[0.06] p-6"
                >
                  <h3 className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
                    <CircleCheck aria-hidden="true" className="size-5 shrink-0 text-[#7ee2b0]" />
                    {step.title}
                  </h3>
                  <p className="text-[0.9375rem] leading-relaxed text-pretty text-white/75">
                    {step.text}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Avis vérifiés : la réception du chantier, et l'écran de l'avis. */}
      <section aria-labelledby="guarantees-reviews" className="py-16 sm:py-24">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col gap-7">
            <SectionHeading
              id="guarantees-reviews"
              eyebrow={t.reviewsEyebrow}
              title={t.reviewsTitle}
              align="left"
            />
            <ul className="flex flex-col gap-4">
              {t.reviews.map((rule) => (
                <CheckLine key={rule}>{rule}</CheckLine>
              ))}
            </ul>
          </div>
          <div className="relative h-[24rem] sm:h-[28rem] lg:order-first">
            <div className="absolute inset-0 right-10 bottom-8 overflow-hidden rounded-hero sm:right-14 sm:bottom-10">
              <ScenePhoto
                scene="handover"
                sizes="(min-width: 1024px) 480px, 85vw"
                position="30% 45%"
                className="size-full"
              />
            </div>
            <div className="absolute right-0 bottom-0 w-[8.5rem] sm:w-[10.5rem]">
              <PhoneMockup screen={APP_SCREENS.clientAvis} alt={m.screens.clientAvis} />
            </div>
          </div>
        </div>
      </section>

      {/* Données personnelles */}
      <section aria-labelledby="guarantees-data" className="bg-surface py-16 sm:py-24">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] lg:gap-16">
          <div className="flex flex-col gap-7">
            <SectionHeading
              id="guarantees-data"
              eyebrow={t.dataEyebrow}
              title={t.dataTitle}
              align="left"
            />
            <ul className="flex flex-col gap-5">
              {t.data.map((item, i) => (
                <IconRow
                  key={item.title}
                  icon={DATA_ICONS[i] ?? ShieldCheck}
                  title={item.title}
                  text={item.text}
                />
              ))}
            </ul>
          </div>
          <div className="aspect-[4/3] overflow-hidden rounded-hero">
            <ScenePhoto
              scene="camilleProject"
              sizes="(min-width: 1024px) 512px, 92vw"
              position="60% 40%"
              className="size-full"
            />
          </div>
        </div>
      </section>

      {/* En cas de problème, puis le classement */}
      <section aria-labelledby="guarantees-issue" className="py-16 sm:py-24">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 sm:px-6">
          <SectionHeading
            id="guarantees-issue"
            eyebrow={t.issueEyebrow}
            title={t.issueTitle}
            align="left"
          />
          <NumberedSteps items={t.issue} />
          <div className="flex flex-col gap-6 rounded-hero bg-primary-soft p-6 sm:p-9 lg:flex-row lg:items-center">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-surface text-primary-strong">
              <Scale aria-hidden="true" className="size-7" strokeWidth={1.75} />
            </span>
            <div className="flex flex-1 flex-col gap-2">
              <p className="text-[0.8125rem] font-bold tracking-[0.08em] text-primary-strong uppercase">
                {t.rankingEyebrow}
              </p>
              <h2 className="font-display text-2xl font-bold tracking-tight">{t.rankingTitle}</h2>
              <p className="text-[0.9375rem] leading-relaxed text-pretty text-label">
                {t.rankingText}
              </p>
            </div>
            <ButtonLink
              href="/criteres-de-classement"
              variant="dark"
              block={false}
              className="shrink-0 self-start lg:self-center"
            >
              {t.rankingLink}
              <ArrowRight aria-hidden="true" className="size-4" />
            </ButtonLink>
          </div>
        </div>
      </section>

      <CtaBand
        id="guarantees-cta"
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
