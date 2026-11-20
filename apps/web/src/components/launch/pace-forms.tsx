"use client";

import { LAUNCH_LIMITS, PACE_LIMITS } from "@menao/core";
import { useActionState } from "react";
import { Alert, Button, Card, CheckboxField, Field, SelectField } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { saveCommercialPace, savePaceSettings } from "@/lib/admin/pace-actions";
import { initialFormState, type FormState } from "@/lib/auth/form";

const t = fr.admin.launch.pace.settings;

/** Clé d'un formulaire : réaffiché avec les valeurs renvoyées après une erreur. */
const formKey = (state: FormState) => JSON.stringify(state.values ?? {});

export type PaceSettingsValues = {
  objectif_valides: number | null;
  debut: string | null;
  fin: string | null;
  rythme_semaine: number;
  rythme_demarrage: number;
  semaines_demarrage: number;
  repere_visites_jour: number;
  email_lundi: boolean;
  classement_visible: boolean;
  alerte_retard: boolean;
};

/**
 * Réglages du rythme (F-184, ADR 0381) : objectif commun et ses dates, rythme par conseiller avec
 * son démarrage, repère de visites, puis les trois cases du suivi. Remplacement complet.
 */
export function PaceSettingsForm({ settings }: { settings: PaceSettingsValues }) {
  const [state, action, pending] = useActionState(savePaceSettings, initialFormState);
  const errors = state.fieldErrors ?? {};
  const v = state.values;
  const checked = (name: string, current: boolean) => (v ? v[name] === "on" : current);
  const monthly = Math.round((settings.rythme_semaine * 52) / 12);
  return (
    <form key={formKey(state)} action={action} noValidate className="flex flex-col gap-5">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Card className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-bold tracking-tight">{t.common}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label={t.goal}
            name="objectif_valides"
            type="number"
            inputMode="numeric"
            min={PACE_LIMITS.objectif.min}
            max={PACE_LIMITS.objectif.max}
            hint={t.goalHint}
            defaultValue={v?.objectif_valides ?? settings.objectif_valides?.toString() ?? ""}
            errors={errors.objectif_valides}
          />
          <Field
            label={t.end}
            name="fin_recrutement"
            type="date"
            min={LAUNCH_LIMITS.minDate}
            max={LAUNCH_LIMITS.maxDate}
            defaultValue={v?.fin_recrutement ?? settings.fin ?? ""}
            errors={errors.fin_recrutement}
          />
          <Field
            label={t.start}
            name="debut_recrutement"
            type="date"
            min={LAUNCH_LIMITS.minDate}
            max={LAUNCH_LIMITS.maxDate}
            hint={t.startHint}
            defaultValue={v?.debut_recrutement ?? settings.debut ?? ""}
            errors={errors.debut_recrutement}
          />
        </div>
      </Card>
      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-lg font-bold tracking-tight">{t.perCommercial}</h2>
          <p className="text-[0.9375rem] text-label">{t.perCommercialLead}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field
            label={t.rampWeeks}
            name="semaines_demarrage"
            type="number"
            inputMode="numeric"
            min={PACE_LIMITS.semainesDemarrage.min}
            max={PACE_LIMITS.semainesDemarrage.max}
            hint={t.rampWeeksHint}
            defaultValue={v?.semaines_demarrage ?? settings.semaines_demarrage.toString()}
            errors={errors.semaines_demarrage}
          />
          <Field
            label={t.ramp}
            name="rythme_demarrage"
            type="number"
            inputMode="numeric"
            min={PACE_LIMITS.demarrage.min}
            max={PACE_LIMITS.demarrage.max}
            hint={t.rampHint}
            defaultValue={v?.rythme_demarrage ?? settings.rythme_demarrage.toString()}
            errors={errors.rythme_demarrage}
          />
          <Field
            label={t.rhythm}
            name="rythme_semaine"
            type="number"
            inputMode="numeric"
            min={PACE_LIMITS.rythme.min}
            max={PACE_LIMITS.rythme.max}
            hint={t.rhythmHint(monthly)}
            defaultValue={v?.rythme_semaine ?? settings.rythme_semaine.toString()}
            errors={errors.rythme_semaine}
          />
          <Field
            label={t.visits}
            name="repere_visites_jour"
            type="number"
            inputMode="numeric"
            min={PACE_LIMITS.repere.min}
            max={PACE_LIMITS.repere.max}
            hint={t.visitsHint}
            defaultValue={v?.repere_visites_jour ?? settings.repere_visites_jour.toString()}
            errors={errors.repere_visites_jour}
          />
        </div>
      </Card>
      <Card className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-bold tracking-tight">{t.follow}</h2>
        {(
          [
            ["email_lundi", t.email, t.emailHint, settings.email_lundi],
            ["classement_visible", t.ranking, t.rankingHint, settings.classement_visible],
            ["alerte_retard", t.alert, t.alertHint, settings.alerte_retard],
          ] as const
        ).map(([name, label, hint, current]) => (
          <CheckboxField key={name} name={name} defaultChecked={checked(name, current)}>
            <span className="flex flex-col gap-0.5">
              <span className="font-semibold">{label}</span>
              <span className="text-label">{hint}</span>
            </span>
          </CheckboxField>
        ))}
      </Card>
      <Button type="submit" block={false} disabled={pending} className="self-start sm:px-8">
        {t.save}
      </Button>
    </form>
  );
}

/** Objectif propre d'un conseiller (temps partiel…) ; nombre vide : il reprend le rythme commun. */
export function CommercialPaceForm({
  commercials,
}: {
  commercials: readonly { id: string; nom: string }[];
}) {
  const o = t.own;
  const [state, action, pending] = useActionState(saveCommercialPace, initialFormState);
  const errors = state.fieldErrors ?? {};
  const v = state.values;
  return (
    <form key={formKey(state)} action={action} noValidate className="flex flex-col gap-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-[1.4fr_0.8fr_1.4fr]">
        <SelectField
          label={o.commercial}
          name="commercial_id"
          defaultValue={v?.commercial_id ?? ""}
          errors={errors.commercial_id}
        >
          <option value="">{o.choose}</option>
          {commercials.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </SelectField>
        <Field
          label={o.perWeek}
          name="rythme_semaine"
          type="number"
          inputMode="numeric"
          min={PACE_LIMITS.rythme.min}
          max={PACE_LIMITS.rythme.max}
          hint={o.perWeekHint}
          defaultValue={v?.rythme_semaine ?? ""}
          errors={errors.rythme_semaine}
        />
        <Field
          label={o.reason}
          name="rythme_raison"
          maxLength={PACE_LIMITS.raison}
          hint={o.reasonHint}
          defaultValue={v?.rythme_raison ?? ""}
          errors={errors.rythme_raison}
        />
      </div>
      <Button
        type="submit"
        block={false}
        variant="secondary"
        disabled={pending}
        className="self-start sm:px-6"
      >
        {o.save}
      </Button>
    </form>
  );
}
