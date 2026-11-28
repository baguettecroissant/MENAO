import "server-only";
import {
  commercialOnboardingProgress,
  commercialOnboardingSteps,
  commercialReady,
  isFormationModule,
  parisToday,
  type CommercialOnboardingRaw,
  type FormationModule,
} from "@menao/core";
import { z } from "zod";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

const date = z.string().nullable();

/** État brut lu par `commercial_onboarding_state` (F-194, ADR 0394). */
export const onboardingStateSchema = z.object({
  contrat_depose_le: date,
  contrat_signe_le: date,
  contrat: z.boolean(),
  rsac_numero: z.string().nullable(),
  rsac_greffe: z.string().nullable(),
  urssaf_deposee_le: date,
  rib_depose_le: date,
  ecran_installe_le: date,
  badge_vu_le: date,
  rappels: z.boolean(),
  modules: z.record(z.string(), z.number().int()),
  meilleur_entrainement: z.number().int().nullable(),
  premier_prospect: z.boolean(),
});
export type OnboardingState = z.infer<typeof onboardingStateSchema>;

/** Données de la base vers la forme du cœur (étapes, badge). */
export function onboardingRaw(state: OnboardingState): CommercialOnboardingRaw {
  const modules: Partial<Record<FormationModule, number>> = {};
  for (const [key, score] of Object.entries(state.modules)) {
    if (isFormationModule(key)) modules[key] = score;
  }
  return {
    contractSignedOn: state.contrat_signe_le,
    rsacNumber: state.rsac_numero,
    urssafDepositedOn: state.urssaf_deposee_le,
    ribDepositedOn: state.rib_depose_le,
    homeScreenOn: state.ecran_installe_le,
    remindersOn: state.rappels,
    modules,
    bestTraining: state.meilleur_entrainement,
    firstBrief: state.premier_prospect,
  };
}

/** État, étapes, avancement et badge d'un conseiller ; null si la lecture échoue. */
export function onboardingView(state: OnboardingState, today = parisToday()) {
  const raw = onboardingRaw(state);
  const steps = commercialOnboardingSteps(raw, today);
  return {
    state,
    raw,
    steps,
    progress: commercialOnboardingProgress(steps),
    ready: commercialReady(raw),
    today,
  };
}
export type OnboardingView = ReturnType<typeof onboardingView>;

export async function getOnboarding(supabase: Client): Promise<OnboardingView | null> {
  const { data, error } = await supabase.rpc("commercial_onboarding_state");
  if (error) return null;
  const parsed = onboardingStateSchema.safeParse(data);
  return parsed.success ? onboardingView(parsed.data) : null;
}

/** Démo par lien (ADR 0344) : une conseillère fictive à mi-parcours, sans base. */
export function demoOnboarding(): OnboardingView {
  const today = parisToday();
  return onboardingView(
    {
      contrat_depose_le: today,
      contrat_signe_le: today,
      contrat: true,
      rsac_numero: "2027 AC 00042",
      rsac_greffe: "Nice",
      urssaf_deposee_le: null,
      rib_depose_le: null,
      ecran_installe_le: today,
      badge_vu_le: null,
      rappels: true,
      modules: { menao: 5, parcours: 4, objections: 3 },
      meilleur_entrainement: 12,
      premier_prospect: false,
    },
    today,
  );
}
