"use client";

import { useActionState, useState } from "react";
import { Autocomplete } from "@/components/autocomplete";
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
    mode: "rayon" | "communes";
    baseLabel: string | null;
    baseCitycode: string | null;
    hasBaseLocation: boolean;
    /** Coordonnées de l'adresse enregistrée (my_artisan_base_point), pour la carte. */
    basePoint: { lon: number; lat: number } | null;
    radiusKm: number | null;
    communes: Commune[];
  };
}) {
  const [state, action, pending] = useActionState(saveZone, initialFormState);
  const [mode, setMode] = useState(initial.mode);
  // L'adresse existante est conservée tant qu'aucune nouvelle n'est choisie (coordonnées côté serveur).
  const [address, setAddress] = useState<AddressSuggestion | null>(null);
  const [communes, setCommunes] = useState<Commune[]>(initial.communes);
  const [radiusKm, setRadiusKm] = useState(String(initial.radiusKm ?? 30));
  const point = address ?? initial.basePoint;
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <RadioGroup
        legend={t.legend}
        name="mode"
        value={mode}
        onChange={(v) => setMode(v as typeof mode)}
        options={[
          { value: "rayon", label: t.modeRayon },
          { value: "communes", label: t.modeCommunes },
        ]}
      />

      {mode === "rayon" ? (
        <div className="flex flex-col gap-4">
          <Autocomplete<AddressSuggestion>
            label={t.address}
            hint={t.addressHint}
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
