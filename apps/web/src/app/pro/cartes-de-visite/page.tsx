import { artisanPageUrl } from "@menao/core";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import {
  BusinessCard,
  BusinessCardSheet,
  CARD_MODELS,
  isCardModel,
  type BusinessCardData,
} from "@/components/pro/business-card-sheet";
import { documentLogoUrl } from "@/lib/documents/logo";
import { Alert } from "@/components/ui";
import { env } from "@/env";
import { fr } from "@/i18n/fr";
import { sheetCard } from "@/components/pro/sheet";
import { requireTeamPermission } from "@/lib/artisan/space";
import { formatPhone } from "@/lib/format";
import { qrSvg } from "@/lib/qr";
import { PrintButton } from "./print-button";

const t = fr.pro.businessCards;

export const metadata: Metadata = { title: `${t.title} — MENAO`, robots: { index: false } };

/**
 * Cartes de visite à donner aux clients (ADR 0161, d'après « Programme de parrainage ») : nom,
 * métier, téléphone et QR code de la fiche publique, pour les inviter à repasser par MENAO et à
 * voir les avis vérifiés. Planche A4 à imprimer depuis le navigateur, hors de la coque de l'espace
 * pro.
 */
export default async function BusinessCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ modele?: string }>;
}) {
  const { modele } = await searchParams;
  const model = isCardModel(modele) ? modele : "signature";
  const space = await requireTeamPermission("storefront");
  const { data: auth } = await space.supabase.auth.getClaims();
  const [{ data: artisan }, { data: profile }, { data: trades }] = await Promise.all([
    space.supabase
      .from("artisans")
      .select("slug, status, nom_commercial, raison_sociale, sirene_partial, logo_path")
      .eq("id", space.artisanId)
      .single(),
    space.supabase
      .from("profiles")
      .select("phone")
      .eq("user_id", auth?.claims.sub ?? "")
      .maybeSingle(),
    space.supabase
      .from("artisan_trades")
      .select("trades(label, sort_order)")
      .eq("artisan_id", space.artisanId),
  ]);
  const person = [space.firstName, space.lastName].filter(Boolean).join(" ").trim();
  // Nom public : jamais la raison sociale en diffusion partielle à l'INSEE (ADR 0144).
  const company =
    artisan?.nom_commercial?.trim() ||
    (artisan?.sirene_partial ? null : artisan?.raison_sociale?.trim()) ||
    null;
  const trade =
    (trades ?? [])
      .map((row) => row.trades)
      .filter((tr): tr is { label: string; sort_order: number } => Boolean(tr))
      .sort((a, b) => a.sort_order - b.sort_order)[0]?.label ?? null;
  const url =
    artisan?.status === "valide" && artisan.slug
      ? artisanPageUrl(env.NEXT_PUBLIC_SITE_URL, artisan.slug)
      : null;
  const qr = url ? qrSvg(url) : null;
  const host = new URL(env.NEXT_PUBLIC_SITE_URL).host;
  const logoUrl = qr ? await documentLogoUrl(space.supabase, artisan?.logo_path) : null;
  const card: BusinessCardData = {
    name: company ?? person,
    person: company ? person || null : null,
    trade,
    phone: profile?.phone ? formatPhone(profile.phone) : null,
    host,
    logoUrl,
    verified: true,
  };

  return (
    // Refonte « Nette » (ADR 0253) : la planche à gauche, l'impression à droite ; à l'impression,
    // la planche seule.
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10 print:max-w-none print:p-0">
      <style>{"@page { size: A4; margin: 10mm; }"}</style>
      <div className="flex flex-col gap-4 print:hidden">
        <Link
          href="/pro/mon-profil"
          className="inline-flex items-center gap-1 self-start rounded-md text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t.back}
        </Link>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[2rem] leading-[1.05] sm:text-[2.5rem]">{t.title}</h1>
          <p className="max-w-3xl text-[0.9375rem] text-label sm:text-base">{t.intro}</p>
        </div>
        {!qr && <Alert tone="info">{t.unavailable}</Alert>}
      </div>

      {qr && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] print:block">
          {/* Maquette du lot 39 : recto et verso en grand à l'écran, la planche seule à l'impression. */}
          <section
            aria-label={t.previewTitle}
            className="flex flex-col items-center gap-6 overflow-hidden rounded-card bg-[#151b2e] px-4 py-8 sm:py-10 print:hidden"
          >
            {(["recto", "verso"] as const).map((face) => (
              <figure key={face} className="flex flex-col items-center gap-2">
                <div className="h-[calc(55mm*1.25)] w-[calc(85mm*1.25)] max-w-full">
                  <div className="w-[85mm] origin-top-left scale-125 overflow-hidden rounded-[3mm] shadow-[0_18px_40px_rgb(11_20_56/0.35)]">
                    <BusinessCard model={model} face={face} card={card} qr={qr} uid="apercu" />
                  </div>
                </div>
                <figcaption className="text-xs text-white/60">{t.faces[face]}</figcaption>
              </figure>
            ))}
          </section>
          <div className="hidden print:block">
            <BusinessCardSheet card={card} qr={qr} model={model} />
          </div>
          <div className="flex flex-col gap-4 print:hidden">
            <section aria-labelledby="modele" className={sheetCard}>
              <h2 id="modele" className="text-lg">
                {t.modelTitle}
              </h2>
              <ul className="flex flex-col gap-2">
                {CARD_MODELS.map((key) => {
                  const active = key === model;
                  return (
                    <li key={key}>
                      <Link
                        href={
                          key === "signature"
                            ? "/pro/cartes-de-visite"
                            : `/pro/cartes-de-visite?modele=${key}`
                        }
                        replace
                        scroll={false}
                        aria-current={active ? "true" : undefined}
                        className={`flex items-center gap-3 rounded-2xl bg-surface p-2.5 transition-colors focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none ${
                          active
                            ? "border-2 border-foreground"
                            : "border border-border hover:border-border-strong"
                        }`}
                      >
                        {/* Vignette : la carte réelle, réduite (85 mm ≈ 321 px). */}
                        <span
                          aria-hidden="true"
                          className="relative h-[4.125rem] w-[6.375rem] shrink-0 overflow-hidden rounded-md shadow-card"
                        >
                          <span className="absolute top-0 left-0 origin-top-left scale-[0.318]">
                            <BusinessCard model={key} card={card} qr={qr} uid={`vignette-${key}`} />
                          </span>
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="text-[0.9375rem] font-bold">{t.models[key].label}</span>
                          <span className="text-[0.8125rem] leading-snug text-muted-foreground">
                            {t.models[key].text}
                          </span>
                        </span>
                        {active && (
                          <span className="flex size-5.5 shrink-0 items-center justify-center rounded-full bg-foreground text-surface">
                            <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
            <section aria-labelledby="imprimer" className={sheetCard}>
              <h2 id="imprimer" className="text-lg">
                {t.printTitle}
              </h2>
              <p className="text-sm text-label">{t.printHint}</p>
              <p className="text-[0.8125rem] text-muted-foreground">{t.printNoDuplex}</p>
              <PrintButton label={t.print} />
            </section>
            <section aria-labelledby="ecran" className={sheetCard}>
              <h2 id="ecran" className="font-sans text-base font-semibold">
                {t.screenTitle}
              </h2>
              <p className="text-sm text-label">{t.screenText}</p>
            </section>
          </div>
        </div>
      )}
    </main>
  );
}
