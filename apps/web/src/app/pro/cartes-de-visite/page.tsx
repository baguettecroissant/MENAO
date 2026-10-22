import { artisanPageUrl } from "@menao/core";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BusinessCardSheet } from "@/components/pro/business-card-sheet";
import { Alert } from "@/components/ui";
import { env } from "@/env";
import { fr } from "@/i18n/fr";
import { requireProSpace } from "@/lib/artisan/space";
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
export default async function BusinessCardsPage() {
  const space = await requireProSpace();
  const { data: auth } = await space.supabase.auth.getClaims();
  const [{ data: artisan }, { data: profile }, { data: trades }] = await Promise.all([
    space.supabase
      .from("artisans")
      .select("slug, status, nom_commercial, raison_sociale, sirene_partial")
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

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 print:max-w-none print:p-0">
      <style>{"@page { size: A4; margin: 10mm; }"}</style>
      <div className="flex flex-col gap-4 print:hidden">
        <Link
          href="/pro/mon-profil"
          className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t.back}
        </Link>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium tracking-tight">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.intro}</p>
        </div>
        {qr ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{t.printHint}</p>
            <PrintButton label={t.print} />
          </div>
        ) : (
          <Alert tone="info">{t.unavailable}</Alert>
        )}
      </div>

      {qr && (
        <BusinessCardSheet
          card={{
            name: company ?? person,
            person: company ? person || null : null,
            trade,
            phone: profile?.phone ? formatPhone(profile.phone) : null,
            host,
          }}
          qr={qr}
        />
      )}
    </main>
  );
}
