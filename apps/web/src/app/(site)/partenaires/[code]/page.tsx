import { normalizePartnerCode } from "@menao/core";
import { parsePartnerPage } from "@menao/validation";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Quote, ShieldCheck } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { NeedForm } from "@/components/project/need-form";
import { PageHero } from "@/components/site/page-hero";
import { SectionHeading } from "@/components/site/section-heading";
import { Steps } from "@/components/site/steps";
import { Card, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { seoCatalog } from "@/lib/site/catalog";
import { frenchSpacing } from "@/lib/site/typography";
import { createPublicClient } from "@/lib/supabase/public";

const t = fr.partnerPage;

// Pages générées à la première visite puis gardées en cache une heure (spec §4.4).
export const revalidate = 3600;

export function generateStaticParams() {
  return [];
}

async function load(raw: string) {
  const code = normalizePartnerCode(raw);
  if (!code) return null;
  const { data } = await createPublicClient().rpc("partner_page", { p_code: code });
  return parsePartnerPage(data);
}

export async function generateMetadata({
  params,
}: PageProps<"/partenaires/[code]">): Promise<Metadata> {
  const page = await load((await params).code);
  if (!page) return {};
  return {
    title: `${t.metaTitle(page.nom)} — MENAO`,
    description: t.metaDescription(page.nom),
    alternates: { canonical: `/partenaires/${page.code}` },
    // Page de campagne d'un partenaire : jamais indexée (contenu proche d'une page à l'autre).
    robots: { index: false, follow: true },
  };
}

/**
 * Page co-marquée d'un partenaire (F-59, lot 3, ADR 0142) : « <Partenaire> vous recommande
 * MENAO », son message, le formulaire de demande (attribuée au partenaire), le fonctionnement et
 * une mention de transparence. En ligne seulement si un admin l'a activée.
 */
export default async function PartnerLandingPage({ params }: PageProps<"/partenaires/[code]">) {
  const page = await load((await params).code);
  if (!page) notFound();
  const { trades } = await seoCatalog();
  const steps = fr.site.clientSteps;

  return (
    <main className="bg-background">
      <PageHero
        id="page-partenaire"
        eyebrow={t.eyebrow(page.nom)}
        title={t.title(page.nom)}
        subtitle={t.lead}
        aside={
          // Maquette du lot 38 : le partenaire et MENAO côte à côte (nom du partenaire, faute de logo).
          <div aria-hidden="true" className="hidden items-center justify-center gap-4 lg:flex">
            <span className="font-display flex h-24 max-w-[16rem] min-w-24 items-center justify-center truncate rounded-[1.5rem] bg-white px-6 text-[1.75rem] font-extrabold tracking-[-0.03em] text-foreground shadow-raised">
              {page.nom}
            </span>
            <span className="text-3xl text-white/70">×</span>
            <span className="flex size-24 items-center justify-center rounded-[1.5rem] bg-white shadow-raised">
              <LogoMark className="w-12" />
            </span>
          </div>
        }
      />

      <section aria-labelledby="page-partenaire-formulaire" className="py-12 sm:py-16">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Card className="flex flex-col gap-5 sm:p-7">
            <div className="flex flex-col gap-1.5">
              <h2 id="page-partenaire-formulaire" className="text-[1.375rem] font-bold">
                {t.formTitle}
              </h2>
              <p className="text-sm text-muted-foreground">{t.formLead}</p>
            </div>
            <NeedForm trades={trades} partnerCode={page.code} />
          </Card>
          {/* Sur mobile, le mot du partenaire avant le formulaire : c'est lui qui donne confiance. */}
          <aside className="order-first flex flex-col gap-3.5 lg:order-none">
            {page.message && (
              <figure className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
                <Quote aria-hidden="true" className="size-5 text-primary" />
                <blockquote className="text-[0.9375rem] leading-relaxed text-pretty">
                  {frenchSpacing(page.message)}
                </blockquote>
                <figcaption className="text-sm font-semibold text-primary-strong">
                  {t.messageFrom(page.nom)}
                </figcaption>
              </figure>
            )}
            <div className="flex gap-2.5 rounded-card bg-primary-soft p-4 text-[0.8125rem] leading-relaxed text-label">
              <ShieldCheck
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-primary-strong"
              />
              <p>
                {t.transparency(page.nom)}{" "}
                <TextLink href="/garanties" className="font-semibold">
                  {t.guarantees}
                </TextLink>
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section aria-labelledby="page-partenaire-etapes" className="bg-surface py-14 sm:py-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 sm:px-6">
          <SectionHeading
            id="page-partenaire-etapes"
            eyebrow={steps.eyebrow}
            title={steps.title}
            subtitle={steps.subtitle}
          />
          <Steps items={steps.items} />
        </div>
      </section>
    </main>
  );
}
