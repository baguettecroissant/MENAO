"use client";

import { PROSPECT_STATUSES } from "@menao/core";
import { Ban, Phone, UserPlus, X } from "lucide-react";
import { useActionState, useRef } from "react";
import { Alert, Button, Field, Hint, SelectField, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState } from "@/lib/auth/form";
import {
  doNotContact,
  followProspect,
  releaseProspect,
  updateProspect,
} from "@/lib/commercial/prospect-actions";

const t = fr.commercialProspects;
const d = t.detail;

/** Suivre un prospect libre (F-65, lot 2, ADR 0206). */
export function FollowProspectForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(followProspect, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Button type="submit" disabled={pending} className="sm:w-auto sm:self-start sm:px-6">
        <UserPlus aria-hidden="true" className="size-4" />
        {d.follow}
      </Button>
      <Hint>{d.followHint}</Hint>
    </form>
  );
}

/**
 * Mon suivi : étape, prochaine action (heure de Paris), téléphone et notes. `nextActionAt` est
 * déjà au format du champ (AAAA-MM-JJTHH:MM, heure de Paris).
 */
export function ProspectFollowForm({
  id,
  status,
  nextActionAt,
  phone,
  notes,
}: {
  id: string;
  status: string;
  nextActionAt: string;
  phone: string;
  notes: string;
}) {
  const [state, action, pending] = useActionState(updateProspect, initialFormState);
  const errors = state.fieldErrors ?? {};
  // Après un refus, la saisie est gardée ; après l'enregistrement, les champs reprennent les
  // valeurs relues dans la base (numéro mis au format international, notes nettoyées).
  const v = state.success ? undefined : state.values;
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="id" value={id} />
      {state.success && <Alert tone="success">{state.success}</Alert>}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <SelectField
        key={`status-${status}`}
        label={d.statusLabel}
        name="status"
        defaultValue={v?.status ?? status}
      >
        {PROSPECT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {t.status[s] ?? s}
          </option>
        ))}
      </SelectField>
      <Field
        key={`next-${nextActionAt}`}
        label={d.nextActionLabel}
        name="nextActionAt"
        type="datetime-local"
        defaultValue={v?.nextActionAt ?? nextActionAt}
        errors={errors.nextActionAt}
      />
      <Field
        key={`phone-${phone}`}
        label={d.phoneLabel}
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="off"
        maxLength={20}
        hint={d.phoneHint}
        defaultValue={v?.phone ?? phone}
        errors={errors.phone}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className="text-sm font-medium">
          {d.notesLabel}
        </label>
        <textarea
          key={`notes-${notes}`}
          id="notes"
          name="notes"
          rows={4}
          maxLength={2000}
          aria-describedby="notes-hint"
          defaultValue={v?.notes ?? notes}
          className={`${inputClasses} py-3`}
        />
        <Hint id="notes-hint">{d.notesHint}</Hint>
      </div>
      <Button type="submit" disabled={pending} className="sm:w-auto sm:self-start sm:px-6">
        {d.save}
      </Button>
    </form>
  );
}

/** Ne plus suivre : le prospect redevient libre, notes effacées. */
export function ReleaseProspectForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(releaseProspect, initialFormState);
  return (
    <form action={action} className="flex flex-col items-start gap-1">
      <input type="hidden" name="id" value={id} />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Button type="submit" variant="ghost" size="sm" block={false} disabled={pending}>
        {d.release}
      </Button>
      <p className="text-xs text-muted-foreground">{d.releaseHint}</p>
    </form>
  );
}

/** Lien d'appel (tel:) vers le numéro enregistré dans mon suivi. */
export function CallLink({ phone, label }: { phone: string; label: string }) {
  return (
    <a
      href={`tel:${phone}`}
      className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-button border border-primary bg-surface px-4 text-sm font-medium text-primary-strong hover:bg-primary-softer focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
    >
      <Phone aria-hidden="true" className="size-4" />
      {label}
    </a>
  );
}

/**
 * « Ne plus contacter » (définitif) : confirmation dans une fenêtre, puis retour à la liste.
 */
export function DoNotContactForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(doNotContact, initialFormState);
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        variant="danger-text"
        size="sm"
        block={false}
        onClick={() => dialog.current?.showModal()}
      >
        <Ban aria-hidden="true" className="size-4" />
        {d.doNotContact}
      </Button>
      <p className="text-xs text-muted-foreground">{d.doNotContactHint}</p>
      <dialog
        ref={dialog}
        aria-labelledby="ne-plus-contacter"
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        className="m-auto w-[min(92vw,28rem)] rounded-card bg-surface p-0 text-foreground backdrop:bg-foreground/60"
      >
        <form action={action} className="flex flex-col gap-4 p-5 sm:p-6">
          <input type="hidden" name="id" value={id} />
          <div className="flex items-start justify-between gap-3">
            <h2 id="ne-plus-contacter" className="text-lg font-medium">
              {d.doNotContact}
            </h2>
            <button
              type="button"
              aria-label={d.doNotContactCancel}
              onClick={() => dialog.current?.close()}
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-background hover:bg-border focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground">{d.doNotContactHint}</p>
          {state.error && <Alert tone="error">{state.error}</Alert>}
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button type="submit" variant="danger" disabled={pending} className="sm:w-auto">
              {d.doNotContactConfirm}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => dialog.current?.close()}
              className="sm:w-auto"
            >
              {d.doNotContactCancel}
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
