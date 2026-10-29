"use client";

import { useActionState, useRef } from "react";
import { Alert, Button, Field, FieldError, Hint, SelectField, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import {
  cancelCommercialBonus,
  inviteCommercial,
  markCommercialBonusesPaid,
  saveCommercialBonusSettings,
  setCommercialStatus,
  setCommercialZone,
  transferCommercialProspects,
} from "@/lib/admin/commercial-actions";
import { initialFormState } from "@/lib/auth/form";

const t = fr.admin.commercials;

/** Invitation d'un commercial (F-65, ADR 0205) : prénom, nom, e-mail et code définitif. */
export function CommercialInviteForm() {
  const [state, action, pending] = useActionState(inviteCommercial, initialFormState);
  const errors = state.fieldErrors ?? {};
  // Après l'envoi, formulaire vide pour l'invitation suivante.
  const v = state.success ? undefined : state.values;
  const f = t.fields;
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      {state.success && <Alert tone="success">{state.success}</Alert>}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          key={`first-${state.success ?? ""}`}
          label={f.firstName}
          name="firstName"
          defaultValue={v?.firstName}
          maxLength={100}
          autoComplete="off"
          errors={errors.firstName}
          required
        />
        <Field
          key={`last-${state.success ?? ""}`}
          label={f.lastName}
          name="lastName"
          defaultValue={v?.lastName}
          maxLength={100}
          autoComplete="off"
          errors={errors.lastName}
          required
        />
      </div>
      <Field
        key={`email-${state.success ?? ""}`}
        label={f.email}
        name="email"
        type="email"
        defaultValue={v?.email}
        autoComplete="off"
        errors={errors.email}
        required
      />
      <Field
        key={`code-${state.success ?? ""}`}
        label={f.code}
        name="code"
        hint={f.codeHint}
        defaultValue={v?.code}
        maxLength={32}
        autoComplete="off"
        autoCapitalize="none"
        errors={errors.code}
        required
      />
      <Button type="submit" disabled={pending} className="sm:w-auto sm:self-start sm:px-6">
        {t.submit}
      </Button>
    </form>
  );
}

/** Suspendre ou réactiver un commercial, depuis sa ligne de la liste. */
export function CommercialStatusForm({ id, status }: { id: string; status: string }) {
  const [state, action, pending] = useActionState(setCommercialStatus, initialFormState);
  const next = status === "suspendu" ? "actif" : "suspendu";
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={next} />
      <Button type="submit" variant="ghost" size="sm" block={false} disabled={pending}>
        {next === "suspendu" ? t.suspend : t.reactivate}
      </Button>
      {state.error && <span className="text-xs text-danger">{state.error}</span>}
    </form>
  );
}

// Résultats et primes des commerciaux (F-65, lot 3, ADR 0207).
const tr = fr.admin.commercialResults;

/** Centimes en euros pour un champ de saisie (« 15,50 »), vide si non réglé. */
const eurosInput = (cents: number | null | undefined) =>
  cents == null ? "" : (cents / 100).toFixed(2).replace(".", ",").replace(",00", "");

/** Réglages des primes : montants (vides tant qu'ils ne sont pas décidés), délai, objectif. */
export function CommercialBonusSettingsForm({
  settings,
}: {
  settings: {
    prime_validation_centimes: number | null;
    prime_abonnement_centimes: number | null;
    delai_validation_jours: number;
    objectif_valides_mois: number | null;
  };
}) {
  const [state, action, pending] = useActionState(saveCommercialBonusSettings, initialFormState);
  const errors = state.fieldErrors ?? {};
  const v = state.values;
  const s = tr.settings;
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      {state.success && <Alert tone="success">{state.success}</Alert>}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="primes-validation"
          label={s.validation}
          name="validation"
          inputMode="decimal"
          defaultValue={v?.validation ?? eurosInput(settings.prime_validation_centimes)}
          errors={errors.validation}
        />
        <Field
          id="primes-abonnement"
          label={s.subscription}
          name="subscription"
          inputMode="decimal"
          defaultValue={v?.subscription ?? eurosInput(settings.prime_abonnement_centimes)}
          errors={errors.subscription}
        />
        <Field
          id="primes-delai"
          label={s.delay}
          name="delay"
          type="number"
          min={0}
          max={180}
          defaultValue={v?.delay ?? String(settings.delai_validation_jours)}
          errors={errors.delay}
          required
        />
        <Field
          id="primes-objectif"
          label={s.objective}
          name="objective"
          type="number"
          min={1}
          max={1000}
          hint={s.objectiveHint}
          defaultValue={v?.objective ?? (settings.objectif_valides_mois?.toString() || "")}
          errors={errors.objective}
        />
      </div>
      <Button
        type="submit"
        variant="secondary"
        block={false}
        disabled={pending}
        className="self-start"
      >
        {s.save}
      </Button>
    </form>
  );
}

/** Zone du commercial : débuts de codes postaux, séparés par des virgules. */
export function CommercialZoneForm({
  commercialId,
  zone,
}: {
  commercialId: string;
  /** Zone enregistrée, déjà mise en forme (« 06000, 061 »). */
  zone: string;
}) {
  const [state, action, pending] = useActionState(setCommercialZone, initialFormState);
  const d = tr.detail;
  const error = state.fieldErrors?.zone?.[0];
  return (
    <form action={action} noValidate className="flex flex-col gap-3">
      <input type="hidden" name="commercial" value={commercialId} />
      {state.success && <Alert tone="success">{state.success}</Alert>}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="zone" className="text-sm font-medium">
          {d.zoneLabel}
        </label>
        <textarea
          id="zone"
          name="zone"
          rows={3}
          defaultValue={state.values?.zone ?? zone}
          inputMode="numeric"
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "zone-erreur zone-aide" : "zone-aide"}
          className={`${inputClasses} py-3`}
        />
        {error && <FieldError id="zone-erreur">{error}</FieldError>}
        <Hint id="zone-aide">{d.zoneHint}</Hint>
      </div>
      <Button
        type="submit"
        variant="secondary"
        block={false}
        disabled={pending}
        className="self-start"
      >
        {d.zoneSave}
      </Button>
    </form>
  );
}

/** Transfert des prospects suivis à un autre commercial actif, ou libération. */
export function CommercialTransferForm({
  commercialId,
  others,
}: {
  commercialId: string;
  /** Commerciaux actifs, sauf celui-ci. */
  others: readonly { id: string; nom: string }[];
}) {
  const [state, action, pending] = useActionState(transferCommercialProspects, initialFormState);
  const [released, release, releasing] = useActionState(
    transferCommercialProspects,
    initialFormState,
  );
  const dialog = useRef<HTMLDialogElement>(null);
  const d = tr.detail;
  return (
    <div className="flex flex-col gap-4">
      {others.length > 0 && (
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="commercial" value={commercialId} />
          {state.error && <Alert tone="error">{state.error}</Alert>}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <SelectField
                id="transfert"
                label={d.transferTo}
                name="to"
                defaultValue=""
                required
                errors={state.fieldErrors?.to}
              >
                <option value="" disabled>
                  {d.choose}
                </option>
                {others.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nom}
                  </option>
                ))}
              </SelectField>
            </div>
            <Button type="submit" variant="secondary" block={false} disabled={pending}>
              {d.transferSubmit}
            </Button>
          </div>
        </form>
      )}
      {/* Libération : suivis et notes effacés, donc confirmation dans une fenêtre. */}
      <div className="flex flex-col items-start gap-1">
        <Button
          type="button"
          variant="danger-text"
          size="sm"
          block={false}
          onClick={() => dialog.current?.showModal()}
        >
          {d.releaseButton}
        </Button>
        <p className="text-xs text-muted-foreground">{d.releaseHint}</p>
      </div>
      <dialog
        ref={dialog}
        aria-labelledby={`liberer-${commercialId}`}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        className="m-auto w-[min(92vw,28rem)] rounded-card bg-surface p-0 text-foreground backdrop:bg-foreground/60"
      >
        <form action={release} className="flex flex-col gap-4 p-5 sm:p-6">
          <input type="hidden" name="commercial" value={commercialId} />
          <input type="hidden" name="release" value="1" />
          <h2 id={`liberer-${commercialId}`} className="text-lg font-medium">
            {d.releaseButton}
          </h2>
          <p className="text-sm text-muted-foreground">{d.releaseHint}</p>
          {released.error && <Alert tone="error">{released.error}</Alert>}
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button type="submit" variant="danger" disabled={releasing} className="sm:w-auto">
              {d.releaseConfirm}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => dialog.current?.close()}
              className="sm:w-auto"
            >
              {d.releaseCancel}
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}

/**
 * Virement fait pour les primes cochées dans le tableau (cases reliées par l'attribut `form`,
 * hors de ce formulaire) : référence obligatoire.
 */
export function PayCommercialBonusesForm({
  formId,
  commercialId,
}: {
  formId: string;
  commercialId: string;
}) {
  const [state, action, pending] = useActionState(markCommercialBonusesPaid, initialFormState);
  const error = state.fieldErrors?.reference?.[0];
  const d = tr.detail;
  return (
    <form id={formId} action={action} noValidate className="flex flex-col gap-3">
      <input type="hidden" name="commercial" value={commercialId} />
      {state.success && <Alert tone="success">{state.success}</Alert>}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Field
            id={`${formId}-reference`}
            label={d.reference}
            name="reference"
            defaultValue={state.values?.reference}
            maxLength={100}
            autoComplete="off"
            errors={error ? [error] : undefined}
            required
          />
        </div>
        <Button type="submit" block={false} disabled={pending}>
          {d.markPaid}
        </Button>
      </div>
    </form>
  );
}

/** Annulation d'une prime en attente ou à payer, avec son motif. */
export function CancelCommercialBonusForm({
  commercialId,
  bonusId,
}: {
  commercialId: string;
  bonusId: string;
}) {
  const [state, action, pending] = useActionState(cancelCommercialBonus, initialFormState);
  const error = state.fieldErrors?.reason?.[0];
  const id = `motif-${bonusId}`;
  const d = tr.detail;
  if (state.success) return <p className="text-xs text-muted-foreground">{state.success}</p>;
  return (
    <form action={action} noValidate className="flex flex-col gap-1">
      <input type="hidden" name="commercial" value={commercialId} />
      <input type="hidden" name="bonus" value={bonusId} />
      <div className="flex items-start gap-2">
        <label htmlFor={id} className="sr-only">
          {d.cancelReason}
        </label>
        <input
          id={id}
          name="reason"
          defaultValue={state.values?.reason}
          maxLength={300}
          placeholder={d.cancelReason}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-erreur` : undefined}
          className={`${inputClasses} min-h-9 text-sm`}
        />
        <Button type="submit" variant="danger-text" size="sm" block={false} disabled={pending}>
          {d.cancel}
        </Button>
      </div>
      {error && <FieldError id={`${id}-erreur`}>{error}</FieldError>}
      {state.error && <FieldError>{state.error}</FieldError>}
    </form>
  );
}
