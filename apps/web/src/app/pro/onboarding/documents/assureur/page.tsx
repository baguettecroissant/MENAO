import { buildInsurerRequest, type InsuranceDocument } from "@menao/core";
import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Card, focusRing } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getOnboardingContext } from "@/lib/artisan/context";
import { InsurerRequest } from "./insurer-request";

const t = fr.pro.onboarding.help.insurer;

/**
 * Message prêt pour l'assureur (lot 60, ADR 0347) : décennale au modèle officiel et RC Pro, avec
 * l'entreprise, le SIRET et les métiers. L'artisan l'envoie depuis sa propre messagerie.
 */
export default async function InsurerRequestPage({
  searchParams,
}: PageProps<"/pro/onboarding/documents/assureur">) {
  const { type } = await searchParams;
  const from: InsuranceDocument = type === "rc_pro" ? "rc_pro" : "decennale";
  const { supabase, userId, artisan, tradeCodes } = await getOnboardingContext();
  const [{ data: trades }, { data: profile }] = await Promise.all([
    supabase
      .from("trades")
      .select("label")
      .in("code", tradeCodes.length ? tradeCodes : ["-"])
      .order("sort_order"),
    supabase.from("profiles").select("first_name, last_name").eq("user_id", userId).single(),
  ]);
  const input = {
    companyName: artisan.nom_commercial || artisan.raison_sociale || "",
    siret: artisan.siret,
    tradeLabels: (trades ?? []).map((trade) => trade.label),
    signature: [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() || null,
  };
  // Les deux messages possibles, calculés ici : le choix « aussi la RC Pro » bascule de l'un à l'autre.
  const both = buildInsurerRequest({ ...input, documents: ["decennale", "rc_pro"] });
  const alone = buildInsurerRequest({ ...input, documents: [from] });

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Link
        href={`/pro/onboarding/documents?type=${from}` as Route}
        className={`inline-flex min-h-touch items-center gap-1.5 self-start rounded-sm text-sm font-semibold text-muted-foreground hover:text-foreground ${focusRing}`}
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {t.back}
      </Link>
      <Card>
        <section aria-labelledby="message-assureur" className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h2 id="message-assureur" className="text-[1.375rem]">
              {t.title}
            </h2>
            <p className="text-label">{t.intro}</p>
          </div>
          <InsurerRequest both={both} alone={alone} />
        </section>
      </Card>
    </div>
  );
}
