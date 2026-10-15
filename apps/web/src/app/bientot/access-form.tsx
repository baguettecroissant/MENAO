"use client";

import { useActionState } from "react";
import { Alert, Button, Field } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState } from "@/lib/auth/form";
import { enterPrelaunch } from "./actions";

const t = fr.prelaunch.access;

/** Accès des testeurs : la page d'attente est servie à l'adresse demandée, qui est rouverte ensuite. */
export function AccessForm() {
  const [state, action, pending] = useActionState(enterPrelaunch, initialFormState);
  // Adresse affichée dans la barre du navigateur (la réécriture la conserve), lue à l'envoi.
  const submit = (formData: FormData) => {
    formData.set("suite", window.location.pathname + window.location.search);
    action(formData);
  };

  return (
    <form action={submit} className="flex flex-col gap-3 text-left" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Field label={t.label} name="code" type="password" autoComplete="off" required />
      <Button type="submit" disabled={pending}>
        {t.submit}
      </Button>
    </form>
  );
}
