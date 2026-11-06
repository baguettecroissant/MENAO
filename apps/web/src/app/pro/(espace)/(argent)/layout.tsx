import { parseAiAgents } from "@menao/core";
import type { ReactNode } from "react";
import { SectionTabs } from "@/components/pro/section-tabs";
import { createClient } from "@/lib/supabase/server";

/**
 * Rubrique « Argent » du menu regroupé (ADR 0188) : onglets en haut des listes. « Suivi » (agent
 * comptable avancé, ADR 0237) seulement si la formule le comprend.
 */
export default async function MoneyLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_ai_agents");
  const advanced = parseAiAgents(data).agents.advancedAccounting;
  return (
    <>
      <SectionTabs section="argent" hidden={advanced ? [] : ["suivi"]} />
      {children}
    </>
  );
}
