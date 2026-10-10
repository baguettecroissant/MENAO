"use client";

import type { EmailPreferences } from "@menao/core";
import { useActionState, useEffect } from "react";
import { Alert, Button } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState } from "@/lib/auth/form";
import { markAllNotificationsRead, saveNotificationPreferences } from "@/lib/notifications/actions";

const t = fr.notificationCenter;

/** Centre affiché : les notifications sont marquées lues (elles restent signalées à l'écran). */
export function MarkAllRead() {
  useEffect(() => {
    void markAllNotificationsRead();
  }, []);
  return null;
}

/** Préférences d'e-mail (F-41) : activité du chantier et rappels, désactivables. */
export function EmailPreferencesForm({ initial }: { initial: EmailPreferences }) {
  const [state, formAction, pending] = useActionState(
    saveNotificationPreferences,
    initialFormState,
  );
  return (
    <form action={formAction} className="flex flex-col gap-3">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      {(["activite", "rappels"] as const).map((key) => (
        <label key={key} className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name={key}
            defaultChecked={initial[key]}
            className="mt-0.5 size-4 shrink-0 accent-primary"
          />
          <span>{t[key]}</span>
        </label>
      ))}
      <Button type="submit" block={false} disabled={pending} className="self-start">
        {t.save}
      </Button>
    </form>
  );
}
