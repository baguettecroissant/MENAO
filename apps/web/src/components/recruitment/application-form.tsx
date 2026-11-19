"use client";

import { recruitmentSourceFromParam } from "@menao/core";
import { Send } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { Alert, Button, Field, FieldError, focusRing, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { applyAsCommercial, type ApplicationState } from "@/lib/site/recruitment-actions";
import { ChoicePills } from "./choice-pills";
import { MeetingChooser } from "./meeting-chooser";

const t = fr.pages.recruitment;
const o = t.options;
const initial: ApplicationState = {};

/**
 * Candidature « Devenir conseiller MENAO » (F-183, ADR 0380). La page reste statique : la
 * provenance d'une annonce (`?source=linkedin`) est lue dans le navigateur pour pré-cocher la
 * réponse. Après l'envoi, le candidat choisit sa réunion d'information sans changer de page.
 */
export function ApplicationForm() {
  const [state, action, pending] = useActionState(applyAsCommercial, initial);
  const [source, setSource] = useState<string | undefined>(undefined);
  useEffect(() => {
    const fromLink = recruitmentSourceFromParam(
      new URLSearchParams(window.location.search).get("source"),
    );
    // Lien d'une annonce : la provenance est pré-cochée (lue après le rendu, la page est statique).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (fromLink) setSource(fromLink);
  }, []);

  if (state.token && state.firstName && state.email) {
    return (
      <MeetingChooser
        token={state.token}
        firstName={state.firstName}
        email={state.email}
        meetings={state.meetings ?? []}
        justApplied
      />
    );
  }
  const errors = state.fieldErrors ?? {};
  const v = state.values;
  const f = t.fields;
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={f.firstName}
          name="first_name"
          autoComplete="given-name"
          maxLength={60}
          required
          defaultValue={v?.first_name}
          errors={errors.first_name}
        />
        <Field
          label={f.lastName}
          name="last_name"
          autoComplete="family-name"
          maxLength={60}
          required
          defaultValue={v?.last_name}
          errors={errors.last_name}
        />
        <Field
          label={f.email}
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={v?.email}
          errors={errors.email}
        />
        <Field
          label={f.phone}
          name="phone"
          type="tel"
          autoComplete="tel"
          required
          defaultValue={v?.phone}
          errors={errors.phone}
        />
      </div>
      <Field
        label={f.sector}
        name="sector"
        maxLength={120}
        required
        hint={f.sectorHint}
        defaultValue={v?.sector}
        errors={errors.sector}
      />
      <ChoicePills
        legend={f.legalStatus}
        name="legal_status"
        options={o.legalStatus}
        defaultValue={v?.legal_status}
        errors={errors.legal_status}
      />
      <ChoicePills
        legend={f.seesArtisans}
        name="sees_artisans"
        options={o.seesArtisans}
        defaultValue={v?.sees_artisans}
        errors={errors.sees_artisans}
      />
      <ChoicePills
        legend={f.experience}
        name="experience"
        options={o.experience}
        defaultValue={v?.experience}
        errors={errors.experience}
      />
      <ChoicePills
        legend={f.availability}
        name="availability"
        options={o.availability}
        defaultValue={v?.availability}
        errors={errors.availability}
      />
      <ChoicePills
        key={source ?? "aucune"}
        legend={f.source}
        name="source"
        options={o.source}
        defaultValue={v?.source || source}
        errors={errors.source}
        hint={f.sourceHint}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="candidature-motivation" className="text-sm font-semibold">
          {f.motivation} <span className="font-normal text-muted-foreground">{f.optional}</span>
        </label>
        <textarea
          id="candidature-motivation"
          name="motivation"
          rows={3}
          maxLength={1000}
          defaultValue={v?.motivation}
          aria-invalid={errors.motivation ? true : undefined}
          className={`${inputClasses} min-h-24 resize-y py-3 text-base`}
        />
        {errors.motivation?.[0] && <FieldError>{errors.motivation[0]}</FieldError>}
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="flex items-start gap-2.5 text-sm leading-relaxed text-label">
          <input
            type="checkbox"
            name="consent"
            defaultChecked={v?.consent === "on"}
            aria-invalid={errors.consent ? true : undefined}
            className={`mt-0.5 size-5 shrink-0 accent-primary ${focusRing}`}
          />
          <span>
            {f.consent}{" "}
            <Link
              href="/confidentialite"
              className="font-semibold text-primary-strong underline-offset-4 hover:underline"
            >
              {f.privacy}
            </Link>
          </span>
        </label>
        {errors.consent?.[0] && <FieldError>{errors.consent[0]}</FieldError>}
      </div>
      <Button type="submit" disabled={pending}>
        <Send aria-hidden="true" className="size-4" />
        {t.submit}
      </Button>
    </form>
  );
}
