"use client";

import { territoryOfInsee, type ZoneMode } from "@menao/core";
import { useActionState, useState } from "react";
import { Autocomplete } from "@/components/autocomplete";
import { TerritoryField } from "@/components/territory-field";
import { Alert, Button, RadioGroup, SelectField } from "@/components/ui";
import { ZoneMap } from "@/components/zone-map";
import { fr } from "@/i18n/fr";
import { saveZone } from "@/lib/artisan/actions";
import { initialFormState } from "@/lib/auth/form";
import {
  searchAddresses,
  searchCommunes,
  type AddressSuggestion,
  type CommuneSuggestion,
} from "@/lib/geo/geoplateforme";

const t = fr.pro.onboarding.zone;

type Commune = { code: string; nom: string };

export function ZoneForm({
  radiusOptions,
  initial,
}: {
  radiusOptions: readonly number[];
  initial: {
    mode: ZoneMode;
    baseLabel: string | null;
    baseCitycode: string | null;
    hasBaseLocation: boolean;
    /** Coordonnées de l'adresse enregistrée (my_artisan_base_point), pour la carte. */
    basePoint: { lon: number; lat: number } | null;
    radiusKm: number | null;
    communes: Commune[];
    /** Départements ou régions enregistrés, selon `mode` (ADR 0213). */
    territories: string[];
  };
}) {
  const [state, action, pending] = useActionState(saveZone, initialFormState);
  const [mode, setMode] = useState(initial.mode);
  // L'adresse existante est conservée tant qu'aucune nouvelle n'est choisie (coordonnées côté serveur).
  const [address, setAddress] = useState<AddressSuggestion | null>(null);
  const [communes, setCommunes] = useState<Commune[]>(initial.communes);
  const [radiusKm, setRadiusKm] = useState(String(initial.radiusKm ?? 30));
  const [territories, setTerritories] = useState(initial.territories);
  const point = address ?? initial.basePoint;
  const citycode = address?.citycode ?? initial.baseCitycode;
  const withBase = mode !== "communes";
  const errors = state.fieldErrors ?? {};

  function chooseMode(next: ZoneMode) {
    setMode(next);
    if (next === initial.mode) return setTerritories(initial.territories);
    // Le territoire de l'adresse de départ est proposé d'emblée.
    const own =
      citycode && (next === "departements" || next === "regions")
        ? territoryOfInsee(next, citycode)
        : null;
    setTerritories(own ? [own] : []);
  }

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <RadioGroup
        legend={t.legend}
        name="mode"
        value={mode}
        onChange={(v) => chooseMode(v as ZoneMode)}
        options={[
          { value: "rayon", label: t.modeRayon },
          { value: "communes", label: t.modeCommunes },
          { value: "departements", label: t.modeDepartements },
          { value: "regions", label: t.modeRegions },
          { value: "france", label: t.modeFrance },
        ]}
      />

      {withBase ? (
        <div className="flex flex-col gap-4">
          <Autocomplete<AddressSuggestion>
            label={t.address}
            hint={mode === "rayon" ? t.addressHint : t.addressTerritoryHint}
            defaultQuery={initial.baseLabel ?? ""}
            errors={errors.baseLabel}
            search={searchAddresses}
            getKey={(a) => `${a.lon},${a.lat}`}
            getLabel={(a) => a.label}
            onSelect={setAddress}
          />
          {address && (
            <>
              <input type="hidden" name="baseLabel" value={address.label} />
              <input type="hidden" name="baseCitycode" value={address.citycode} />
              <input type="hidden" name="lon" value={address.lon} />
              <input type="hidden" name="lat" value={address.lat} />
            </>
          )}
          {!address && initial.hasBaseLocation && <input type="hidden" name="keepBase" value="1" />}
          {mode === "rayon" && (
            <>
              <SelectField
                label={t.radius}
                name="radiusKm"
                value={radiusKm}
                onChange={(event) => setRadiusKm(event.target.value)}
                errors={errors.radiusKm}
              >
                {radiusOptions.map((km) => (
                  <option key={km} value={km}>
                    {t.radiusOption(km)}
                  </option>
                ))}
              </SelectField>
              {point && <ZoneMap lon={point.lon} lat={point.lat} radiusKm={Number(radiusKm)} />}
            </>
          )}
          {(mode === "departements" || mode === "regions") && (
            <>
              <TerritoryField
                mode={mode}
                codes={territories}
                onChange={setTerritories}
                errors={errors.territories}
                labels={{
                  search: mode === "regions" ? t.regionSearch : t.departementSearch,
                  hint: mode === "regions" ? t.regionSearchHint : t.departementSearchHint,
                  list: t.territories,
                  remove: t.remove,
                }}
              />
              <input type="hidden" name="territories" value={JSON.stringify(territories)} />
            </>
          )}
          {mode === "france" && <p className="text-sm text-muted-foreground">{t.franceNote}</p>}
          {(mode === "regions" || mode === "france") && (
            <p className="text-sm text-muted-foreground">{t.wideNote}</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Autocomplete<CommuneSuggestion>
            label={t.communeSearch}
            hint={t.communeSearchHint}
            clearOnSelect
            errors={errors.communes}
            search={searchCommunes}
            getKey={(c) => c.code}
            getLabel={(c) => (c.postcode ? `${c.nom} (${c.postcode})` : c.nom)}
            onSelect={(c) =>
              setCommunes((prev) =>
                prev.some((p) => p.code === c.code)
                  ? prev
                  : [...prev, { code: c.code, nom: c.nom }],
              )
            }
          />
          <input type="hidden" name="communes" value={JSON.stringify(communes)} />
          {communes.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label={t.communes}>
              {communes.map((c) => (
                <li
                  key={c.code}
                  className="inline-flex items-center gap-1 rounded-chip bg-primary-soft pl-3 text-primary"
                >
                  {c.nom}
                  <button
                    type="button"
                    aria-label={t.remove(c.nom)}
                    onClick={() => setCommunes((prev) => prev.filter((p) => p.code !== c.code))}
                    className="inline-flex size-touch items-center justify-center rounded-chip"
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Button type="submit" disabled={pending}>
        {fr.pro.onboarding.saveAndContinue}
      </Button>
    </form>
  );
}
