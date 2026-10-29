"use client";

import { useActionState } from "react";
import { Alert, Button } from "@/components/ui";
import { loadConnectPrefill, startConnectOnboarding } from "@/lib/artisan/actions";
import { createConnectTokens } from "@/lib/artisan/connect-tokens";
import type { FormState } from "@/lib/auth/form";

/**
 * Ouvre l'inscription Stripe. `prefill` : premier passage, le compte va être créé ; son identité
 * est d'abord pré-remplie par des jetons créés dans le navigateur (ADR 0204).
 */
export function ConnectButton({ label, prefill = false }: { label: string; prefill?: boolean }) {
  const [state, action, pending] = useActionState<FormState>(async () => {
    // Un pré-remplissage impossible ne bloque jamais l'ouverture de Stripe.
    const data = prefill ? await loadConnectPrefill().catch(() => null) : null;
    return startConnectOnboarding(await createConnectTokens(data));
  }, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Button type="submit" disabled={pending} className="sm:w-auto sm:self-start sm:px-6">
        {label}
      </Button>
    </form>
  );
}
