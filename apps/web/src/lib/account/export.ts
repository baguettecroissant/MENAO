import "server-only";
import type { Role } from "@menao/core";
import { accountExport as buildAccountExport, type ExportClient } from "@menao/documents";
import type { User } from "@supabase/supabase-js";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Export des données personnelles (RGPD, art. 15 et 20 ; ADR 0039) : tout ce que le compte peut
 * lire, avec sa propre session. Le contenu est commun au site et à l'application
 * (`@menao/documents`, ADR 0083).
 */
export function accountExport(
  supabase: Supabase,
  user: User,
  role: Role,
): Promise<Record<string, unknown>> {
  return buildAccountExport(
    // Le client Supabase, vu par l'export comme une simple lecture de tables.
    supabase as unknown as ExportClient,
    {
      id: user.id,
      email: user.email ?? null,
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at ?? null,
      role,
    },
    new Date(),
  );
}
