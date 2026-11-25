"use server";

import { TEST_FILL_ROWS, testFillRowSteps, testFillUntil, type TestFillRow } from "@menao/core";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sendWhenReady } from "./auto-send";
import { getOnboardingContext } from "./context";

/**
 * Comptes d'essai (F-192, ADR 0392) : « Remplir » une ligne, « Tout remplir » jusqu'à une ligne,
 * ou vider les attestations d'exemple. La base refuse tout compte qui n'est pas un compte d'essai.
 * Le dossier part dès qu'il peut partir : un compte d'essai est alors validé tout de suite.
 */
function rowOf(formData: FormData): TestFillRow | null {
  const value = formData.get("row");
  return TEST_FILL_ROWS.find((row) => row === value) ?? null;
}

async function fill(steps: string[]): Promise<void> {
  const { supabase, artisan } = await getOnboardingContext();
  if (steps.length > 0) await supabase.rpc("fill_test_onboarding", { p_steps: steps });
  await sendWhenReady();
  revalidatePath("/pro/onboarding", "layout");
  const { data } = await supabase
    .from("artisans")
    .select("status, compte_essai")
    .eq("id", artisan.id)
    .maybeSingle();
  if (data?.compte_essai && data.status === "valide") {
    // Rôle « artisan » dans la session, puis l'écran « Dossier d'essai validé ».
    await supabase.auth.refreshSession();
    redirect("/pro/onboarding/essai-valide" as Route);
  }
}

export async function fillTestRow(formData: FormData): Promise<void> {
  const row = rowOf(formData);
  if (row) await fill(testFillRowSteps(row));
}

export async function fillTestUntil(formData: FormData): Promise<void> {
  const row = rowOf(formData);
  if (row) await fill(testFillUntil(row));
}

export async function clearTestAttestations(): Promise<void> {
  const { supabase } = await getOnboardingContext();
  await supabase.rpc("clear_test_attestations");
  revalidatePath("/pro/onboarding", "layout");
}
