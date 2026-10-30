"use client";

import {
  ACQUISITION_CHANNELS,
  LAUNCH_FIGURES_LIMITS,
  LAUNCH_LIMITS,
  type AcquisitionChannel,
} from "@menao/core";
import { Check, Copy, QrCode, X } from "lucide-react";
import { useActionState, useId, useRef, useState } from "react";
import { QrSvg } from "@/components/pro/share-card";
import { Alert, Button, CheckboxField, Field, SelectField } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { saveAcquisitionCode, saveLaunchSettings } from "@/lib/admin/launch-actions";
import { initialFormState, type FormState } from "@/lib/auth/form";

const t = fr.admin.launch;

/** Clé d'un formulaire : réaffiché avec les valeurs renvoyées après une erreur. */
const formKey = (state: FormState) => JSON.stringify(state.values ?? {});

/**
 * Réglages des chiffres (F-66, lot 2, ADR 0209) : début et fin du recrutement (semaines de la
 * courbe, jours restants), seuil de couverture et seuil d'une fiche complète. Remplacement complet ;
 * champ vide : valeur par défaut.
 */
export function LaunchSettingsForm({
  settings,
}: {
  settings: {
    debut_recrutement: string | null;
    fin_recrutement: string | null;
    seuil_couverture: number;
    seuil_fiche_complete: number;
  };
}) {
  const [state, action, pending] = useActionState(saveLaunchSettings, initialFormState);
  const errors = state.fieldErrors ?? {};
  const v = state.values;
  const s = t.figures.settings;
  const l = LAUNCH_FIGURES_LIMITS;
  return (
    <form key={formKey(state)} action={action} noValidate className="flex flex-col gap-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={s.debut}
          name="debut_recrutement"
          type="date"
          min={LAUNCH_LIMITS.minDate}
          max={LAUNCH_LIMITS.maxDate}
          defaultValue={v?.debut_recrutement ?? settings.debut_recrutement ?? ""}
          errors={errors.debut_recrutement}
        />
        <Field
          label={s.fin}
          name="fin_recrutement"
          type="date"
          min={LAUNCH_LIMITS.minDate}
          max={LAUNCH_LIMITS.maxDate}
          hint={s.datesHint}
          defaultValue={v?.fin_recrutement ?? settings.fin_recrutement ?? ""}
          errors={errors.fin_recrutement}
        />
        <Field
          label={s.seuilCouverture}
          name="seuil_couverture"
          type="number"
          inputMode="numeric"
          min={l.coverageThresholdMin}
          max={l.coverageThresholdMax}
          hint={s.seuilCouvertureHint}
          defaultValue={v?.seuil_couverture ?? settings.seuil_couverture.toString()}
          errors={errors.seuil_couverture}
        />
        <Field
          label={s.seuilFiche}
          name="seuil_fiche_complete"
          type="number"
          inputMode="numeric"
          min={l.profileThresholdMin}
          max={l.profileThresholdMax}
          hint={s.seuilFicheHint}
          defaultValue={v?.seuil_fiche_complete ?? settings.seuil_fiche_complete.toString()}
          errors={errors.seuil_fiche_complete}
        />
      </div>
      <Button type="submit" block={false} disabled={pending} className="self-start sm:px-6">
        {s.save}
      </Button>
    </form>
  );
}

/**
 * Code de suivi /p/<code> : création (code, libellé, canal, responsable ; le code naît actif) ou
 * modification (libellé, canal, responsable, actif ; le code est définitif, renvoyé caché).
 */
export function AcquisitionCodeForm({
  code,
  members,
}: {
  code?: {
    id: string;
    code: string;
    libelle: string;
    canal: AcquisitionChannel;
    member_id: string | null;
    active: boolean;
  };
  members: readonly { id: string; nom: string }[];
}) {
  const [state, action, pending] = useActionState(saveAcquisitionCode, initialFormState);
  const errors = state.fieldErrors ?? {};
  const v = state.values;
  const c = t.codes;
  const f = c.fields;
  return (
    <form key={formKey(state)} action={action} noValidate className="flex flex-col gap-4">
      {code && (
        <>
          <input type="hidden" name="id" value={code.id} />
          <input type="hidden" name="code" value={code.code} />
        </>
      )}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {!code && (
        <Field
          label={f.code}
          name="code"
          hint={f.codeHint}
          defaultValue={v?.code ?? ""}
          maxLength={32}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          errors={errors.code}
          required
        />
      )}
      <Field
        label={f.libelle}
        name="libelle"
        hint={f.libelleHint}
        defaultValue={v?.libelle ?? code?.libelle ?? ""}
        maxLength={LAUNCH_FIGURES_LIMITS.codeLabelMaxLength}
        autoComplete="off"
        errors={errors.libelle}
        required
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label={f.canal}
          name="canal"
          defaultValue={v?.canal ?? code?.canal ?? "terrain"}
          errors={errors.canal}
          required
        >
          {ACQUISITION_CHANNELS.map((canal) => (
            <option key={canal} value={canal}>
              {t.channels[canal]}
            </option>
          ))}
        </SelectField>
        <SelectField
          label={f.member}
          name="member_id"
          defaultValue={v?.member_id ?? code?.member_id ?? ""}
          errors={errors.member_id}
        >
          <option value="">{f.memberNone}</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nom}
            </option>
          ))}
        </SelectField>
      </div>
      {code && (
        <CheckboxField name="active" defaultChecked={v ? v.active === "on" : code.active}>
          {f.active}
        </CheckboxField>
      )}
      <Button type="submit" block={false} disabled={pending} className="self-start sm:px-6">
        {code ? c.save : c.create}
      </Button>
    </form>
  );
}

/**
 * Lien d'inscription d'un code de suivi : « Copier le lien » (le lien reste sélectionnable si le
 * navigateur refuse la copie) et le QR code agrandi pour l'imprimer ou le faire scanner.
 */
export function AcquisitionCodeLink({
  code,
  link,
  qr,
}: {
  code: string;
  link: string;
  qr: { size: number; path: string };
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [copied, setCopied] = useState(false);
  const c = t.codes;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Copie refusée par le navigateur : le lien reste sélectionnable.
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="rounded-input border border-border bg-background px-3 py-2 text-xs break-all select-all">
        <span className="sr-only">{c.link(code)} : </span>
        {link}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" block={false} onClick={copy}>
          {copied ? (
            <Check aria-hidden="true" className="size-4" />
          ) : (
            <Copy aria-hidden="true" className="size-4" />
          )}
          {copied ? c.copied : c.copy}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          block={false}
          aria-label={c.qrOpen(code)}
          onClick={() => dialog.current?.showModal()}
        >
          <QrCode aria-hidden="true" className="size-4" />
          {c.qrButton}
        </Button>
      </div>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        className="m-auto w-[min(92vw,26rem)] rounded-card bg-white p-0 text-foreground backdrop:bg-foreground/60"
      >
        <div className="flex flex-col items-center gap-4 px-6 pt-4 pb-8 text-center">
          <button
            type="button"
            aria-label={c.close}
            onClick={() => dialog.current?.close()}
            className="flex size-11 items-center justify-center self-end rounded-full bg-background hover:bg-border focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
          <h3 id={titleId} className="text-2xl font-medium tracking-[0.08em] break-all">
            {code}
          </h3>
          <QrSvg qr={qr} label={c.qr(code)} className="aspect-square w-full max-w-[20rem]" />
          <p className="text-sm break-all text-muted-foreground">{link}</p>
        </div>
      </dialog>
    </div>
  );
}
