"use client";

import { useActionState } from "react";
import { VoiceCall } from "@/components/assistant/voice-call";
import { Alert, Button, CheckboxField, Field, Hint, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState } from "@/lib/auth/form";
import {
  markSecretaryMessage,
  prepareSecretaryCall,
  saveSecretarySettings,
} from "@/lib/artisan/secretary-actions";

const t = fr.pro.onboarding.plans.secretary;

/** Appel d'essai : le serveur prépare le jeton et le contexte juste avant l'appel. */
export function SecretaryTestCall() {
  return (
    <VoiceCall
      assistant="secretary"
      session={prepareSecretaryCall}
      labels={{ start: t.testStart, hint: t.testHint, live: t.live, speaking: t.speaking }}
    />
  );
}

export function SecretarySettingsForm({
  displayName,
  fallbackName,
  canBook,
  visitMinutes,
  instructions,
}: {
  displayName: string | null;
  fallbackName: string;
  canBook: boolean;
  visitMinutes: number;
  instructions: string | null;
}) {
  const [state, action, pending] = useActionState(saveSecretarySettings, initialFormState);
  const v = state.values;
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      <Field
        label={t.displayName}
        name="displayName"
        maxLength={80}
        hint={t.displayNameHint(fallbackName)}
        defaultValue={v?.displayName ?? displayName ?? ""}
      />
      <CheckboxField name="canBook" defaultChecked={canBook}>
        {t.canBook}
      </CheckboxField>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="visitMinutes" className="text-sm font-medium text-foreground">
          {t.visitMinutes}
        </label>
        <select
          id="visitMinutes"
          name="visitMinutes"
          defaultValue={v?.visitMinutes ?? String(visitMinutes)}
          className={inputClasses}
        >
          {[30, 60, 90, 120].map((m) => (
            <option key={m} value={m}>
              {t.visitChoices[m]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="instructions" className="text-sm font-medium text-foreground">
          {t.instructions}
        </label>
        <textarea
          id="instructions"
          name="instructions"
          rows={3}
          maxLength={600}
          defaultValue={v?.instructions ?? instructions ?? ""}
          aria-describedby="instructions-hint"
          className={`${inputClasses} min-h-20 py-2`}
        />
        <Hint id="instructions-hint">{t.instructionsHint}</Hint>
      </div>
      <Button type="submit" block={false} disabled={pending} className="self-start">
        {t.save}
      </Button>
    </form>
  );
}

export function SecretaryMessageToggle({ id, done }: { id: string; done: boolean }) {
  const [, action, pending] = useActionState(markSecretaryMessage, initialFormState);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="done" value={done ? "non" : "oui"} />
      <Button type="submit" variant="ghost" size="sm" block={false} disabled={pending}>
        {done ? t.markTodo : t.markDone}
      </Button>
    </form>
  );
}
