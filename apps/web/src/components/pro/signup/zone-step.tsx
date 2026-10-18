"use client";

import { ZONE_RADIUS_OPTIONS_KM, type ArtisanSignupDraft } from "@menao/core";
import { ArrowRight, MapPin } from "lucide-react";
import { useState } from "react";
import { Autocomplete } from "@/components/autocomplete";
import { Button } from "@/components/ui";
import { ZoneMap } from "@/components/zone-map";
import { fr } from "@/i18n/fr";
import { searchAddresses, type AddressSuggestion } from "@/lib/geo/geoplateforme";
import { ChoiceGroup, LinkButton, StepFooter, StepTitle } from "./signup-ui";

const t = fr.pro.signUp.zone;

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
        <ZoneMap
          lon={base.lon}
          lat={base.lat}
          radiusKm={draft.radiusKm}
          label={fromSeat && draft.company?.city ? draft.company.city : t.address}
        />
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
