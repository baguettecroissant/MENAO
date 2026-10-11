import "server-only";
import {
  clientPendingActions,
  roleFromAppMetadata,
  type ChantierStatus,
  type PaymentStatus,
  type Role,
} from "@menao/core";
import { cache } from "react";
import { avatarUrl } from "@/lib/chantier/storage";
import { createClient } from "@/lib/supabase/server";

export type ShellAccount = {
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  role: Role;
};

/**
 * Compte affiché dans la coque de l'application (ADR 0034, 0035) : nom, photo, rôle, messages non
 * lus et, pour un particulier, chantiers qui attendent une action (devis à signer, acompte ou
 * solde). null sans compte connecté (les pages redirigent alors vers la connexion). Mis en cache
 * pour la durée de la requête.
 */
export const getShellAccount = cache(
  async (): Promise<{ account: ShellAccount; unreadMessages: number; actions: number } | null> => {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getClaims();
    if (!auth || auth.claims.is_anonymous) return null;
    const role = roleFromAppMetadata(auth.claims.app_metadata);
    const [{ data: profile }, { data: unread }, { data: chantiers }] = await Promise.all([
      supabase
        .from("profiles")
        .select("first_name, last_name, avatar_path")
        .eq("user_id", auth.claims.sub)
        .maybeSingle(),
      supabase.rpc("my_unread_messages"),
      role === "particulier"
        ? supabase.rpc("particulier_chantiers")
        : Promise.resolve({ data: [] }),
    ]);
    return {
      account: {
        firstName: profile?.first_name ?? null,
        lastName: profile?.last_name ?? null,
        avatarUrl: avatarUrl(supabase, profile?.avatar_path),
        role,
      },
      unreadMessages: unread ?? 0,
      actions: clientPendingActions(
        (chantiers ?? []).map((c) => ({
          status: c.status as ChantierStatus,
          quoteId: c.quote_id,
          quoteStatus: c.quote_status,
          depositCents: c.deposit_cents,
          depositStatus: c.deposit_status as PaymentStatus | null,
          balanceCents: c.balance_cents,
          balanceStatus: c.balance_status as PaymentStatus | null,
        })),
      ),
    };
  },
);
