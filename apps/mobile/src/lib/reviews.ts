import { canReview, type ValueForMoney } from "@menao/core";
import { fr } from "@/i18n/fr";
import { artisanAvatar, chantierAddress } from "./chantiers";
import { supabase } from "./supabase";

export type ReviewState = {
  title: string;
  address: string | null;
  artisanName: string;
  artisanId: string;
  projectId: string;
  tradeLabel: string | null;
  avatarUrl: string | null;
  /** Solde payé, chantier clôturé (étapes « PV · Solde · Avis »). */
  closed: boolean;
  /** Avis déjà laissé : écran de remerciement. */
  reviewed: boolean;
  /** Avis possible : PV de réception signé, pas encore d'avis (F-27). */
  allowed: boolean;
};

/**
 * Avis du client (F-28), comme sur le site : possible dès le PV de réception signé, un avis par
 * chantier ; l'avis ne conditionne aucun paiement (F-27).
 */
export async function loadReviewState(chantierId: string): Promise<ReviewState | null> {
  const [{ data: rows }, { data: reception }, { data: review }] = await Promise.all([
    supabase.rpc("particulier_chantiers", { p_chantier_id: chantierId }),
    supabase.from("receptions").select("status").eq("chantier_id", chantierId).maybeSingle(),
    supabase.from("reviews").select("id").eq("chantier_id", chantierId).maybeSingle(),
  ]);
  const c = rows?.[0];
  if (!c) return null;
  return {
    title: c.title,
    address: chantierAddress(c),
    artisanName: c.artisan_name,
    artisanId: c.artisan_id,
    projectId: c.project_id,
    tradeLabel: c.trade_label,
    avatarUrl: artisanAvatar(c.artisan_avatar_path),
    closed: c.status === "cloture",
    reviewed: review !== null,
    allowed: canReview({
      receptionSigned: reception?.status === "signe",
      hasReview: review !== null,
    }),
  };
}

export type ReviewInput = {
  quality: number;
  delays: number;
  communication: number;
  cleanliness: number;
  value_for_money: ValueForMoney;
  comment: string;
};

/** F-28 : publication de l'avis (particulier_submit_review : droits, un avis par chantier). */
export async function submitReview(chantierId: string, input: ReviewInput): Promise<string | null> {
  const { error } = await supabase.rpc("particulier_submit_review", {
    p_chantier_id: chantierId,
    p_quality: input.quality,
    p_delays: input.delays,
    p_communication: input.communication,
    p_cleanliness: input.cleanliness,
    p_value: input.value_for_money,
    p_comment: input.comment,
  });
  if (!error) return null;
  return error.code === "22023" || error.code === "42501" ? error.message : fr.errors.generic;
}
