"use client";

import { useSearchParams } from "next/navigation";
import { NeedForm } from "./need-form";

/** Pré-remplit la saisie depuis l'accueil (?q=…) ou un raccourci métier (?metier=…). */
export function NeedFormFromQuery({ trades }: { trades: { code: string; label: string }[] }) {
  const params = useSearchParams();
  const q = params.get("q")?.slice(0, 5000) ?? "";
  const metier = params.get("metier");
  const trade = metier && trades.some((t) => t.code === metier) ? metier : null;
  return <NeedForm key={`${q}|${trade}`} trades={trades} initialText={q} initialTrade={trade} />;
}
