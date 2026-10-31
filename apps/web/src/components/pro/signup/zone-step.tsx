"use client";

import {
  SIGNUP_ZONE_MODES,
  ZONE_RADIUS_OPTIONS_KM,
  signupStepDone,
  territoryOfInsee,
  type ArtisanSignupDraft,
  type SignupZoneMode,
} from "@menao/core";
import { ArrowRight, MapPin } from "lucide-react";
import { useState } from "react";
import { Autocomplete } from "@/components/autocomplete";
import { TerritoryField } from "@/components/territory-field";
import { Button } from "@/components/ui";
import { ZoneMap } from "@/components/zone-map";
import { fr } from "@/i18n/fr";
import { searchAddresses, type AddressSuggestion } from "@/lib/geo/geoplateforme";
import { ChoiceGroup, LinkButton, StepFooter, StepTitle } from "./signup-ui";

const t = fr.pro.signUp.zone;

const MODE_LABELS: Record<SignupZoneMode, string> = {
  rayon: t.modeRayon,
  departements: t.modeDepartements,
  regions: t.modeRegions,
  france: t.modeFrance,
};

/**
 * Étape « zone » : rayon autour du siège (ou d'une autre adresse de départ), départements, régions
 * ou toute la France (ADR 0213). L'adresse de départ est toujours demandée.
 */
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
  const mode = draft.zoneMode;

  function chooseMode(zoneMode: SignupZoneMode) {
    // Le territoire de l'adresse de départ est proposé d'emblée.
    const own =
      base && (zoneMode === "departements" || zoneMode === "regions")
        ? territoryOfInsee(zoneMode, base.citycode)
        : null;
    update({ zoneMode, territories: own ? [own] : [] });
  }

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

      <ChoiceGroup<SignupZoneMode>
        legend={t.mode}
        value={mode}
        options={SIGNUP_ZONE_MODES.map((value) => ({ value, label: MODE_LABELS[value] }))}
        onChange={chooseMode}
      />

      {mode === "rayon" && base && (
        <ZoneMap
          lon={base.lon}
          lat={base.lat}
          radiusKm={draft.radiusKm}
          label={fromSeat && draft.company?.city ? draft.company.city : t.address}
        />
      )}

      {mode === "rayon" && (
        <ChoiceGroup<number>
          legend={t.radius}
          columns={3}
          value={draft.radiusKm}
          options={ZONE_RADIUS_OPTIONS_KM.map((km) => ({ value: km, label: t.km(km) }))}
          onChange={(radiusKm) => update({ radiusKm })}
        />
      )}
      {(mode === "departements" || mode === "regions") && (
        <TerritoryField
          mode={mode}
          codes={draft.territories}
          onChange={(territories) => update({ territories })}
          labels={{
            search: mode === "regions" ? t.regionSearch : t.departementSearch,
            hint: mode === "regions" ? t.regionSearchHint : t.departementSearchHint,
            list: t.territories,
            remove: t.remove,
          }}
        />
      )}
      {!base && <p className="text-sm text-muted-foreground">{t.noBase}</p>}
      {base && mode === "rayon" && (
        <p className="text-sm text-muted-foreground">{t.summary(draft.radiusKm, place)}</p>
      )}
      {mode === "france" && <p className="text-sm text-muted-foreground">{t.franceNote}</p>}
      {(mode === "regions" || mode === "france") && (
        <p className="text-sm text-muted-foreground">{t.wideNote}</p>
      )}
      {mode === "rayon" && <p className="text-sm text-muted-foreground">{t.communesLater}</p>}

      <StepFooter>
        <Button size="lg" onClick={onNext} disabled={!signupStepDone("zone", draft)}>
          {fr.pro.signUp.continue}
          <ArrowRight aria-hidden="true" className="size-5" />
        </Button>
      </StepFooter>
    </>
  );
}
