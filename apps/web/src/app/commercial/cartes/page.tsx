import { partnerLinks } from "@menao/core";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BusinessCardSheet } from "@/components/pro/business-card-sheet";
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

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 print:max-w-none print:p-0">
      <style>{"@page { size: A4; margin: 10mm; }"}</style>
      <div className="flex flex-col gap-4 print:hidden">
        <Link
          href="/commercial"
          className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t.back}
        </Link>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium tracking-tight">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.intro}</p>
        </div>
        {link ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{t.printHint}</p>
            <PrintButton label={t.print} />
          </div>
        ) : (
          <Alert tone="info">{t.unavailable}</Alert>
        )}
      </div>

      {link && commercial && (
        <BusinessCardSheet
          card={{
            name,
            person: t.role,
            trade: t.codeLine(commercial.code),
            phone: space.phone ? formatPhone(space.phone) : null,
            host,
          }}
          qr={qrSvg(link)}
          qrAlt={fr.commercialSpace.code.qrAlt}
          scan={t.scan}
        />
      )}
    </main>
  );
}
