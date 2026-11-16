import { PREPARE_ITEMS, partnerLinks } from "@menao/core";
import { ArrowLeft, Check, Clock, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { QrSvg } from "@/components/pro/share-card";
import { Alert } from "@/components/ui";
import { env } from "@/env";
import { fr } from "@/i18n/fr";
import { getCommercialSpace } from "@/lib/commercial/space";
import { qrSvg } from "@/lib/qr";
import { PrintButton } from "@/app/pro/cartes-de-visite/print-button";

const t = fr.commercialSpace.memo;

export const metadata: Metadata = { title: `${t.title} — MENAO`, robots: { index: false } };

/**
 * Mémo A4 du commercial (lot 60, ADR 0347) : ce que l'artisan prépare et où le trouver, ce que fait
 * le conseiller pendant le rendez-vous, et le QR code d'inscription avec son code. Imprimé depuis
 * le navigateur, hors de la coque de l'espace (comme les cartes, ADR 0205).
 */
export default async function CommercialMemoPage() {
  const space = await getCommercialSpace("/commercial/memo");
  const { commercial, active } = space;
  const link =
    commercial && active ? partnerLinks(env.NEXT_PUBLIC_SITE_URL, commercial.code).pros : null;
  const name =
    [space.account.firstName, space.account.lastName].filter(Boolean).join(" ").trim() ||
    commercial?.nom ||
    "";
  const qr = link ? qrSvg(link) : null;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10 print:max-w-none print:p-0">
      <style>{"@page { size: A4; margin: 12mm; }"}</style>
      <div className="flex flex-col gap-5 print:hidden">
        <Link
          href="/commercial"
          className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t.back}
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[1.875rem] leading-tight font-bold tracking-[-0.03em] sm:text-[2.25rem]">
              {t.title}
            </h1>
            <p className="max-w-xl text-[0.9375rem] text-muted-foreground">{t.intro}</p>
          </div>
          {qr && (
            <div className="flex flex-col items-start gap-1.5">
              <PrintButton label={t.print} />
              <p className="text-[0.8125rem] text-muted-foreground">{t.printHint}</p>
            </div>
          )}
        </div>
      </div>

      {commercial && qr ? (
        <article
          aria-label={t.previewLabel}
          className="flex flex-col gap-6 rounded-card border border-border bg-surface p-6 shadow-card sm:p-10 print:rounded-none print:border-0 print:p-0 print:shadow-none"
        >
          <div className="flex items-center justify-between">
            <Logo />
            <span className="text-sm font-semibold text-muted-foreground">{t.kicker}</span>
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-[1.75rem] leading-tight font-bold tracking-[-0.03em] sm:text-[2.25rem]">
              {t.heading}
            </h2>
            <p className="text-label">{t.lead}</p>
          </div>
          <ul className="flex flex-col">
            {PREPARE_ITEMS.map((item) => (
              <li
                key={item.key}
                className="flex flex-col gap-1 border-t border-border py-3 sm:flex-row sm:gap-4"
              >
                <span className="flex items-center gap-3 font-semibold sm:w-56 sm:shrink-0">
                  <span
                    aria-hidden="true"
                    className="size-5 shrink-0 rounded-[0.375rem] border-2 border-border-strong"
                  />
                  {item.title}
                </span>
                <span className="text-sm leading-relaxed text-label sm:pt-0.5">{item.hint}</span>
              </li>
            ))}
          </ul>
          <p className="flex gap-2.5 rounded-input bg-primary-softer p-3 text-sm text-label">
            <Clock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary-strong" />
            {t.missing}
          </p>
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-semibold">{t.duringTitle}</h3>
            <ul className="flex flex-col gap-1.5">
              {t.during.map((line) => (
                <li key={line} className="flex gap-2.5 text-[0.9375rem] text-label">
                  <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <p className="flex gap-2.5 text-sm text-label">
            <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {t.safety}
          </p>
          <div className="flex items-center gap-5 rounded-card border border-border p-5">
            <QrSvg qr={qr} label={fr.commercialSpace.code.qrAlt} className="size-32 shrink-0" />
            <div className="flex flex-col gap-1.5">
              <p className="text-lg font-bold">{t.scan}</p>
              {name && <p className="text-[0.9375rem] text-label">{t.advisor(name)}</p>}
              <p className="text-[0.9375rem] font-semibold">{t.code(commercial.code)}</p>
              <p className="text-sm text-muted-foreground">
                {new URL(env.NEXT_PUBLIC_SITE_URL).host}
              </p>
            </div>
          </div>
        </article>
      ) : (
        <Alert tone="info">{t.unavailable}</Alert>
      )}
    </main>
  );
}
