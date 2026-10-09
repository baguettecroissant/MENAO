"use client";

import { useActionState } from "react";
import { Alert, Button } from "@/components/ui";
import { startConnectOnboarding } from "@/lib/artisan/actions";
import type { FormState } from "@/lib/auth/form";

export function ConnectButton({ label }: { label: string }) {
  const [state, action, pending] = useActionState<FormState>(startConnectOnboarding, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Button type="submit" disabled={pending} className="sm:w-auto sm:self-start sm:px-6">
        {label}
      </Button>
    </form>
  );
}
