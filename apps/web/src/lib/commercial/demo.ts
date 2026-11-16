import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import type { ShellAccount } from "@/lib/client/shell";
import { createClient } from "@/lib/supabase/server";
import { demoClient } from "./demo-data";
import { COMMERCIAL_DEMO_COOKIE } from "./demo-cookie";

/**
 * Démo de l'espace commercial (F-65, lot 57, ADR 0344) : ouverte par le lien à clé secrète, qui
 * pose un cookie. Chaque page revérifie la clé (lien changé ou désactivé : la démo se ferme).
 */
export const commercialDemoActive = cache(async (): Promise<boolean> => {
  const key = (await cookies()).get(COMMERCIAL_DEMO_COOKIE)?.value;
  if (!key || !/^[a-f0-9]{32}$/.test(key)) return false;
  const supabase = await createClient();
  const { data } = await supabase.rpc("commercial_demo_open", { p_key: key });
  return data === true;
});

/** Compte affiché dans la démo : une conseillère fictive. */
export const DEMO_ACCOUNT: ShellAccount = {
  firstName: "Sarah",
  lastName: "K.",
  avatarUrl: null,
  role: "commercial",
};

/** Espace d'une conseillère fictive, de la même forme que `getCommercialSpace()`. */
export function demoCommercialSpace() {
  return {
    supabase: demoClient(),
    email: null,
    phone: "0639980010",
    account: DEMO_ACCOUNT,
    commercial: {
      code: "SARAH-06",
      nom: "Sarah K.",
      status: "actif" as const,
      zone_codes_postaux: ["06"],
    },
    active: true,
    zone: ["06"],
    demo: true,
  };
}
