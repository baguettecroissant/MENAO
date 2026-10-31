import {
  SIGNUP_ZONE_MODES,
  ZONE_RADIUS_OPTIONS_KM,
  territoryOfInsee,
  type ArtisanSignupDraft,
  type SignupZoneMode,
} from "@menao/core";
import { MapPin } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AutocompleteField } from "@/components/autocomplete-field";
import { TerritoryField } from "@/components/territory-field";
import { ZoneMap } from "@/components/zone-map";
import { fr } from "@/i18n/fr";
import { searchStartAddress, type AddressSuggestion } from "@/lib/geo";
import { Card, LinkText } from "@/ui";
import { theme } from "@/ui/theme";
import { ChoiceGroup, Muted, StepTitle } from "./signup-parts";

const t = fr.proSignup.zone;
const { colors, font, radius, spacing } = theme;

const MODE_LABELS: Record<SignupZoneMode, string> = {
  rayon: t.modeRayon,
  departements: t.modeDepartements,
  regions: t.modeRegions,
  france: t.modeFrance,
};

/**
 * Étape « zone » : rayon autour du siège ou d'une autre adresse de départ, départements, régions
 * ou toute la France (ADR 0213). L'adresse de départ est toujours demandée.
 */
export function ZoneStep({
  draft,
  update,
}: {
  draft: ArtisanSignupDraft;
  update: (patch: Partial<ArtisanSignupDraft>) => void;
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
        <Card>
          <View style={styles.base}>
            <View style={styles.icon}>
              <MapPin size={20} color={colors["primary-strong"]} />
            </View>
            <View style={styles.baseText}>
              <Text style={styles.baseTitle}>{fromSeat ? t.from(place) : t.address}</Text>
              <Text style={styles.baseHint} numberOfLines={2}>
                {fromSeat ? t.fromHint : base.label}
              </Text>
            </View>
            <LinkText label={t.change} onPress={() => setEditing(true)} />
          </View>
        </Card>
      ) : (
        <AutocompleteField<AddressSuggestion>
          label={t.address}
          hint={t.addressHint}
          search={searchStartAddress}
          itemLabel={(a) => a.label}
          onSelect={(a) => {
            update({ base: { label: a.label, citycode: a.citycode, lon: a.lon, lat: a.lat } });
            setEditing(false);
          }}
        />
      )}
      <ChoiceGroup<SignupZoneMode>
        legend={t.mode}
        value={mode}
        options={SIGNUP_ZONE_MODES.map((value) => ({ value, label: MODE_LABELS[value] }))}
        onChange={chooseMode}
      />
      {mode === "rayon" && base ? (
        <ZoneMap
          lon={base.lon}
          lat={base.lat}
          radiusKm={draft.radiusKm}
          label={fromSeat && draft.company?.city ? draft.company.city : t.address}
        />
      ) : null}
      {mode === "rayon" ? (
        <ChoiceGroup<number>
          legend={t.radius}
          columns={3}
          value={draft.radiusKm}
          options={ZONE_RADIUS_OPTIONS_KM.map((km) => ({ value: km, label: t.km(km) }))}
          onChange={(radiusKm) => update({ radiusKm })}
        />
      ) : null}
      {mode === "departements" || mode === "regions" ? (
        <TerritoryField
          mode={mode}
          codes={draft.territories}
          onChange={(territories) => update({ territories })}
          labels={{
            search: mode === "regions" ? t.regionSearch : t.departementSearch,
            hint: mode === "regions" ? t.regionSearchHint : t.departementSearchHint,
            remove: t.remove,
          }}
        />
      ) : null}
      {!base ? <Muted>{t.noBase}</Muted> : null}
      {base && mode === "rayon" ? <Muted>{t.summary(draft.radiusKm, place)}</Muted> : null}
      {mode === "france" ? <Muted>{t.franceNote}</Muted> : null}
      {mode === "regions" || mode === "france" ? <Muted>{t.wideNote}</Muted> : null}
      {mode === "rayon" ? <Muted>{t.communesLater}</Muted> : null}
    </>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: "row", alignItems: "center", gap: spacing(3) },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.input,
    backgroundColor: colors["primary-soft"],
    alignItems: "center",
    justifyContent: "center",
  },
  baseText: { flex: 1, gap: 2 },
  baseTitle: { fontFamily: font.bold, fontSize: 16, color: colors.foreground },
  baseHint: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
});
