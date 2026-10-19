"use client";

import { useActionState } from "react";
import { Alert, Button, Field, FieldError, SelectField, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import {
  cancelPartnerCommission,
  clearCommissionReview,
  markPartnerCommissionsPaid,
  renewPartnerDashboard,
  savePartner,
  savePartnerPage,
  savePartnerSettings,
} from "@/lib/admin/partner-actions";
import { initialFormState } from "@/lib/auth/form";

const t = fr.admin.partners;

/** Centimes en euros pour un champ de saisie (« 15,50 »), vide si non réglé. */
const eurosInput = (cents: number | null | undefined) =>
  cents == null ? "" : (cents / 100).toFixed(2).replace(".", ",").replace(",00", "");

type PartnerValues = {
  id: string;
  code: string;
  nom: string;
  siret: string;
  contact_email: string;
  contact_phone: string | null;
  plafond_demandes_mois: number | null;
  status: "actif" | "suspendu";
  montant_demande_centimes: number | null;
  montant_abonne_centimes: number | null;
  notes: string | null;
};

/** Création ou fiche d'un partenaire (F-59, ADR 0136) ; le code ne change plus une fois créé. */
export function PartnerForm({ partner }: { partner?: PartnerValues }) {
  const [state, action, pending] = useActionState(savePartner, initialFormState);
  const errors = state.fieldErrors ?? {};
  const v = state.values;
  const f = t.fields;
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      {partner && <input type="hidden" name="id" value={partner.id} />}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={f.code}
          name="code"
          hint={partner ? undefined : f.codeHint}
          defaultValue={v?.code ?? partner?.code}
          readOnly={Boolean(partner)}
          maxLength={32}
          autoComplete="off"
          errors={errors.code}
          required
        />
        <Field
          label={f.nom}
          name="nom"
          defaultValue={v?.nom ?? partner?.nom}
          maxLength={120}
          errors={errors.nom}
          required
        />
        <Field
          label={f.siret}
          name="siret"
          inputMode="numeric"
          defaultValue={v?.siret ?? partner?.siret}
          maxLength={20}
          errors={errors.siret}
          required
        />
        <Field
          label={f.email}
          name="email"
          type="email"
          defaultValue={v?.email ?? partner?.contact_email}
          maxLength={254}
          errors={errors.email}
          required
        />
        <Field
          label={f.phone}
          name="phone"
          type="tel"
          hint={f.phoneHint}
          defaultValue={v?.phone ?? partner?.contact_phone ?? ""}
          maxLength={20}
          autoComplete="off"
          errors={errors.phone}
        />
        <Field
          label={f.montantDemande}
          name="montantDemande"
          inputMode="decimal"
          hint={f.montantHint}
          defaultValue={v?.montantDemande ?? eurosInput(partner?.montant_demande_centimes)}
          errors={errors.montantDemande}
        />
        <Field
          label={f.montantAbonne}
          name="montantAbonne"
          inputMode="decimal"
          hint={f.montantHint}
          defaultValue={v?.montantAbonne ?? eurosInput(partner?.montant_abonne_centimes)}
          errors={errors.montantAbonne}
        />
        <Field
          label={f.plafond}
          name="plafond"
          inputMode="numeric"
          hint={f.plafondHint}
          defaultValue={v?.plafond ?? partner?.plafond_demandes_mois?.toString() ?? ""}
          errors={errors.plafond}
        />
        {partner && (
          <SelectField label={f.status} name="status" defaultValue={v?.status ?? partner.status}>
            <option value="actif">{t.status.actif}</option>
            <option value="suspendu">{t.status.suspendu}</option>
          </SelectField>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className="text-sm font-medium">
          {f.notes}
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={2000}
          defaultValue={v?.notes ?? partner?.notes ?? ""}
          className={`${inputClasses} py-3`}
        />
      </div>
      <Button type="submit" block={false} disabled={pending} className="self-start">
        {partner ? t.save : t.create}
      </Button>
    </form>
  );
}

/** Réglages du programme : montants par défaut, délai de validation, plafond mensuel. */
export function PartnerSettingsForm({
  settings,
}: {
  settings: {
    montant_demande_centimes: number | null;
    montant_abonne_centimes: number | null;
    delai_validation_jours: number;
    plafond_demandes_mois: number | null;
  };
}) {
  const [state, action, pending] = useActionState(savePartnerSettings, initialFormState);
  const errors = state.fieldErrors ?? {};
  const v = state.values;
  const s = t.settings;
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      {state.success && <Alert tone="success">{state.success}</Alert>}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="reglages-montant-demande"
          label={s.montantDemande}
          name="montantDemande"
          inputMode="decimal"
          defaultValue={v?.montantDemande ?? eurosInput(settings.montant_demande_centimes)}
          errors={errors.montantDemande}
        />
        <Field
          id="reglages-montant-abonne"
          label={s.montantAbonne}
          name="montantAbonne"
          inputMode="decimal"
          defaultValue={v?.montantAbonne ?? eurosInput(settings.montant_abonne_centimes)}
          errors={errors.montantAbonne}
        />
        <Field
          id="reglages-delai"
          label={s.delai}
          name="delai"
          type="number"
          min={0}
          max={180}
          hint={s.delaiHint}
          defaultValue={v?.delai ?? String(settings.delai_validation_jours)}
          errors={errors.delai}
          required
        />
        <Field
          id="reglages-plafond"
          label={s.plafond}
          name="plafond"
          type="number"
          min={1}
          hint={s.plafondHint}
          defaultValue={v?.plafond ?? (settings.plafond_demandes_mois?.toString() || "")}
          errors={errors.plafond}
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

/** Virement fait pour les commissions à payer du partenaire : référence obligatoire. */
export function PayCommissionsForm({
  partnerId,
  commissionIds,
}: {
  partnerId: string;
  commissionIds: readonly string[];
}) {
  const [state, action, pending] = useActionState(markPartnerCommissionsPaid, initialFormState);
  const error = state.fieldErrors?.reference?.[0];
  return (
    <form action={action} noValidate className="flex flex-col gap-3">
      <input type="hidden" name="partner" value={partnerId} />
      {commissionIds.map((id) => (
        <input key={id} type="hidden" name="commission" value={id} />
      ))}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Field
            label={t.commissions.reference}
            name="reference"
            maxLength={100}
            errors={error ? [error] : undefined}
            required
          />
        </div>
        <Button type="submit" block={false} disabled={pending}>
          {t.commissions.pay}
        </Button>
      </div>
    </form>
  );
}

/** Annulation d'une commission en attente ou à payer, avec son motif. */
export function CancelCommissionForm({
  partnerId,
  commissionId,
}: {
  partnerId: string;
  commissionId: string;
}) {
  const [state, action, pending] = useActionState(cancelPartnerCommission, initialFormState);
  const error = state.fieldErrors?.reason?.[0];
  const id = `motif-${commissionId}`;
  if (state.success) return <p className="text-xs text-muted-foreground">{state.success}</p>;
  return (
    <form action={action} noValidate className="flex flex-col gap-1">
      <input type="hidden" name="partner" value={partnerId} />
      <input type="hidden" name="commission" value={commissionId} />
      <div className="flex items-start gap-2">
        <label htmlFor={id} className="sr-only">
          {t.commissions.cancelReason}
        </label>
        <input
          id={id}
          name="reason"
          maxLength={300}
          placeholder={t.commissions.cancelReason}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-erreur` : undefined}
          className={`${inputClasses} min-h-9 text-sm`}
        />
        <Button type="submit" variant="danger-text" size="sm" block={false} disabled={pending}>
          {t.commissions.cancel}
        </Button>
      </div>
      {error && <FieldError id={`${id}-erreur`}>{error}</FieldError>}
      {state.error && <FieldError>{state.error}</FieldError>}
    </form>
  );
}

/** « Valider quand même » une prime à vérifier (ADR 0145) ; la validation normale suit. */
export function ClearReviewForm({
  partnerId,
  commissionId,
}: {
  partnerId: string;
  commissionId: string;
}) {
  const [state, action, pending] = useActionState(clearCommissionReview, initialFormState);
  if (state.success) return <p className="text-xs text-muted-foreground">{state.success}</p>;
  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="partner" value={partnerId} />
      <input type="hidden" name="commission" value={commissionId} />
      <Button type="submit" variant="secondary" size="sm" block={false} disabled={pending}>
        {t.review.clear}
      </Button>
      {state.error && <FieldError>{state.error}</FieldError>}
    </form>
  );
}

/** Création ou renouvellement du lien de l'espace partenaire (ADR 0139). */
export function RenewDashboardForm({ partnerId, exists }: { partnerId: string; exists: boolean }) {
  const [state, action, pending] = useActionState(renewPartnerDashboard, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="partner" value={partnerId} />
      {state.success && <Alert tone="success">{state.success}</Alert>}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="secondary" block={false} disabled={pending}>
          {exists ? t.space.renew : t.space.create}
        </Button>
        {exists && <span className="text-xs text-muted-foreground">{t.space.renewHint}</span>}
      </div>
    </form>
  );
}

/** Page co-marquée du partenaire (ADR 0142) : en ligne ou non, message de recommandation. */
export function PartnerPageForm({
  partnerId,
  code,
  publique,
  message,
}: {
  partnerId: string;
  code: string;
  publique: boolean;
  message: string | null;
}) {
  const [state, action, pending] = useActionState(savePartnerPage, initialFormState);
  const p = t.page;
  const v = state.values;
  const error = state.fieldErrors?.message?.[0];
  return (
    <form action={action} noValidate className="flex flex-col gap-3">
      <input type="hidden" name="partner" value={partnerId} />
      <input type="hidden" name="code" value={code} />
      {state.success && <Alert tone="success">{state.success}</Alert>}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="publique"
          defaultChecked={v ? v.publique === "on" : publique}
          className="size-4 accent-primary"
        />
        {p.publique}
      </label>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="page-message" className="text-sm font-medium">
          {p.message}
        </label>
        <textarea
          id="page-message"
          name="message"
          rows={3}
          maxLength={400}
          defaultValue={v?.message ?? message ?? ""}
          aria-invalid={error ? true : undefined}
          aria-describedby="page-message-aide"
          className={`${inputClasses} py-3`}
        />
        <p id="page-message-aide" className="text-xs text-muted-foreground">
          {p.messageHint}
        </p>
        {error && <FieldError>{error}</FieldError>}
      </div>
      <Button
        type="submit"
        variant="secondary"
        block={false}
        disabled={pending}
        className="self-start"
      >
        {p.save}
      </Button>
    </form>
  );
}
