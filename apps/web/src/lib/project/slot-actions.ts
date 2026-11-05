"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import type { FormState } from "@/lib/auth/form";
import { createClient } from "@/lib/supabase/server";

/**
 * Accepter en un toucher (ADR 0222) : le client choisit l'un des créneaux proposés par l'artisan ;
 * le rendez-vous est fixé et le chantier s'ouvre.
 */
export async function chooseSlot(
  proposalId: string,
  slot: string,
  _prev: FormState,
  _formData: FormData,
): Promise<FormState> {
  if (!z.uuid().safeParse(proposalId).success || Number.isNaN(new Date(slot).getTime())) {
    return { error: fr.errors.generic };
  }
  const supabase = await createClient();
  const { data: chantierId, error } = await supabase.rpc("particulier_choose_slot", {
    p_proposal_id: proposalId,
    p_slot: slot,
  });
  if (error || !chantierId) {
    return { error: error?.code === "22023" ? error.message : fr.errors.generic };
  }
  revalidatePath("/mon-espace", "layout");
  redirect(`/mon-espace/chantiers/${chantierId}` as Route);
}
