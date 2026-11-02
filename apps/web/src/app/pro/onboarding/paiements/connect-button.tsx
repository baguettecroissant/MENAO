"use client";

import { useActionState } from "react";
import { Alert, Button } from "@/components/ui";
import { startConnectOnboarding } from "@/lib/artisan/actions";
import type { FormState } from "@/lib/auth/form";

/**
 * Ouvre l'inscription sur le site de Stripe : secours du formulaire intégré (ADR 0215), quand il ne
 * se charge pas. Le compte existe déjà, pré-rempli à sa création (ADR 0204).
 */
export function ConnectButton({
  label,
  variant = "primary",
}: {
  label: string;
  variant?: "primary" | "outline";
}) {
  const [state, action, pending] = useActionState<FormState>(() => startConnectOnboarding(), {});
  return (
    <form action={action} className="flex flex-col gap-2">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Button
        type="submit"
        variant={variant}
        disabled={pending}
        className="sm:w-auto sm:self-start sm:px-6"
      >
        {label}
      </Button>
    </form>
  );
}
