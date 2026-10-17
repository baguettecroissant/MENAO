"use client";

import { ZONE_RADIUS_OPTIONS_KM, type ArtisanSignupDraft } from "@menao/core";
import { ArrowRight, MapPin } from "lucide-react";
import { useState } from "react";
import { Autocomplete } from "@/components/autocomplete";
import { Button } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { searchAddresses, type AddressSuggestion } from "@/lib/geo/geoplateforme";
import { ChoiceGroup, LinkButton, StepFooter, StepTitle } from "./signup-ui";

const t = fr.pro.signUp.zone;

/** Taille du cercle de l'illustration selon le rayon (part de la hauteur du cadre). */
const CIRCLE: Record<number, number> = { 10: 30, 20: 42, 30: 54, 50: 68, 75: 84, 100: 96 };

/** Étape « zone » : rayon autour du siège (ou d'une autre adresse de départ). */
export function ZoneStep({
  draft,
  update,
  onNext,
}: {
  draft: ArtisanSignupDraft;
  update: (patch: Partial<ArtisanSignupDraft>) => void;
  onNext: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const base = draft.base;
  const fromSeat = base !== null && draft.company?.citycode === base.citycode;
  const place = base ? (fromSeat && draft.company?.city ? draft.company.city : base.label) : "";
  const size = CIRCLE[draft.radiusKm] ?? 42;

  return (
    <>
      <StepTitle title={t.title} lead={t.lead} />

      {base && !editing ? (
        <div className="flex items-center gap-3 rounded-card border border-border bg-surface px-4 py-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-input bg-primary-soft text-primary-strong">
            <MapPin aria-hidden="true" className="size-5" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="font-semibold">{fromSeat ? t.from(place) : t.address}</span>
            <span className="truncate text-sm text-muted-foreground">
              {fromSeat ? t.fromHint : base.label}
            </span>
          </span>
          <LinkButton onClick={() => setEditing(true)} className="self-center">
            {t.change}
          </LinkButton>
        </div>
      ) : (
        <Autocomplete<AddressSuggestion>
          label={t.address}
          hint={t.addressHint}
          search={searchAddresses}
          getKey={(a) => `${a.label}-${a.lon}-${a.lat}`}
          getLabel={(a) => a.label}
          onSelect={(a) => {
            update({ base: { label: a.label, citycode: a.citycode, lon: a.lon, lat: a.lat } });
            setEditing(false);
          }}
          searchIcon
        />
      )}

      {base && (
        <div
          aria-hidden="true"
          className="relative h-52 overflow-hidden rounded-card border border-border bg-primary-softer [background-image:repeating-linear-gradient(0deg,transparent_0_34px,rgb(255_255_255/0.9)_34px_37px),repeating-linear-gradient(90deg,transparent_0_46px,rgb(255_255_255/0.9)_46px_49px)]"
        >
          <div
            className="absolute top-1/2 left-1/2 aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-primary/15 transition-[height] duration-300"
            style={{ height: `${size}%` }}
          />
          <div className="absolute top-1/2 left-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-surface bg-primary" />
          <span className="absolute top-[calc(50%+14px)] left-1/2 -translate-x-1/2 rounded-pill bg-surface px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap">
            {fromSeat && draft.company?.city ? draft.company.city : t.address}
          </span>
        </div>
      )}

      <ChoiceGroup<number>
        legend={t.radius}
        columns={3}
        value={draft.radiusKm}
        options={ZONE_RADIUS_OPTIONS_KM.map((km) => ({ value: km, label: t.km(km) }))}
        onChange={(radiusKm) => update({ radiusKm })}
      />
      {base ? (
        <p className="text-sm text-muted-foreground">{t.summary(draft.radiusKm, place)}</p>
      ) : (
        <p className="text-sm text-muted-foreground">{t.noBase}</p>
      )}
      <p className="text-sm text-muted-foreground">{t.communesLater}</p>

      <StepFooter>
        <Button size="lg" onClick={onNext} disabled={!base}>
          {fr.pro.signUp.continue}
          <ArrowRight aria-hidden="true" className="size-5" />
        </Button>
      </StepFooter>
    </>
  );
}
