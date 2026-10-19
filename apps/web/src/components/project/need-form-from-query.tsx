"use client";

import { normalizePartnerCode } from "@menao/core";
import { useSearchParams } from "next/navigation";
import { NeedForm } from "./need-form";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Pré-remplit la saisie depuis l'accueil (?q=…), un raccourci métier (?metier=…) ou « Redemander
 * un devis » (?artisan=…&depuis=…&nom=…, ADR 0040 : le chantier commun est vérifié par le serveur).
 * Un lien partenaire (?p=…, F-59) est transmis avec la demande, sans être gardé dans le navigateur.
 */
export function NeedFormFromQuery({ trades }: { trades: { code: string; label: string }[] }) {
  const params = useSearchParams();
  const q = params.get("q")?.slice(0, 5000) ?? "";
  const metier = params.get("metier");
  const trade = metier && trades.some((t) => t.code === metier) ? metier : null;
  const artisanId = params.get("artisan") ?? "";
  const chantierId = params.get("depuis") ?? "";
  const name = params.get("nom")?.trim().slice(0, 80) ?? "";
  const rehire =
    UUID.test(artisanId) && UUID.test(chantierId) && name ? { artisanId, chantierId, name } : null;
  const partnerCode = normalizePartnerCode(params.get("p"));
  return (
    <NeedForm
      key={`${q}|${trade}|${artisanId}`}
      trades={trades}
      initialText={q}
      initialTrade={trade}
      rehire={rehire}
      partnerCode={partnerCode}
    />
  );
}
