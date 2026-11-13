import { partnerLinks } from "@menao/core";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BusinessCard, BusinessCardSheet } from "@/components/pro/business-card-sheet";
import { Alert } from "@/components/ui";
import { env } from "@/env";
import { fr } from "@/i18n/fr";
import { getCommercialSpace } from "@/lib/commercial/space";
import { formatPhone } from "@/lib/format";
import { qrSvg } from "@/lib/qr";
import { PrintButton } from "@/app/pro/cartes-de-visite/print-button";

const t = fr.commercialSpace.cards;

export const metadata: Metadata = { title: `${t.title} — MENAO`, robots: { index: false } };

/**
 * Cartes du commercial (ADR 0205, « Carte du commercial avec son code » du kit terrain) : nom,
 * « Conseiller MENAO », téléphone, code et QR code d'inscription. Planche A4 imprimée depuis le
 * navigateur, hors de la coque de l'espace (même planche que les cartes des artisans, ADR 0161).
 */
export default async function CommercialCardsPage() {
  const space = await getCommercialSpace("/commercial/cartes");
  const { commercial, active } = space;
  const link =
    commercial && active ? partnerLinks(env.NEXT_PUBLIC_SITE_URL, commercial.code).pros : null;
  const name =
    [space.account.firstName, space.account.lastName].filter(Boolean).join(" ").trim() ||
    commercial?.nom ||
    "";
  const host = new URL(env.NEXT_PUBLIC_SITE_URL).host;
  const card =
    link && commercial
      ? {
          name,
          person: t.role,
          trade: t.codeLine(commercial.code),
          phone: space.phone ? formatPhone(space.phone) : null,
          host,
        }
      : null;
  const qr = link ? qrSvg(link) : null;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10 print:max-w-none print:p-0">
      <style>{"@page { size: A4; margin: 10mm; }"}</style>
      <div className="flex flex-col gap-5 print:hidden">
        <Link
          href="/commercial"
          className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t.back}
        </Link>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[1.875rem] leading-tight font-bold tracking-[-0.03em] sm:text-[2.25rem]">
            {t.title}
          </h1>
          <p className="text-[0.9375rem] text-muted-foreground">{t.intro}</p>
        </div>
        {card && qr ? (
          // Maquette du lot 38 : la carte en grand, l'impression et son conseil à droite.
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <section
              aria-label={t.previewLabel}
              className="flex flex-col items-center gap-4 overflow-hidden rounded-card border border-border bg-surface px-4 py-8 shadow-card sm:py-10"
            >
              <div className="h-[calc(55mm*1.25)] w-[calc(85mm*1.25)] max-w-full">
                <div className="w-[85mm] origin-top-left scale-125 overflow-hidden rounded-[2mm] shadow-raised">
                  <BusinessCard
                    model="signature"
                    card={card}
                    qr={qr}
                    qrAlt={fr.commercialSpace.code.qrAlt}
                    scan={t.scan}
                    scanHint={null}
                    uid="apercu"
                  />
                </div>
              </div>
              <p className="text-[0.8125rem] text-muted-foreground">{t.format}</p>
            </section>
            <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card">
              <h2 className="text-lg font-semibold">{t.print}</h2>
              <p className="text-sm text-muted-foreground">{t.printHint}</p>
              <PrintButton label={t.print} />
            </section>
          </div>
        ) : (
          <Alert tone="info">{t.unavailable}</Alert>
        )}
      </div>

      {card && qr && (
        <div className="hidden print:block">
          <BusinessCardSheet
            card={card}
            qr={qr}
            qrAlt={fr.commercialSpace.code.qrAlt}
            scan={t.scan}
          />
        </div>
      )}
    </main>
  );
}
