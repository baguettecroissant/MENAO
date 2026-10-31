import { ZONE_RADIUS_OPTIONS_KM, territoryOfInsee, type ZoneMode } from "@menao/core";
import { MapPin, X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AutocompleteField } from "@/components/autocomplete-field";
import { ChoiceGroup } from "@/components/pro-signup/signup-parts";
import { TerritoryField } from "@/components/territory-field";
import { TopBar } from "@/components/top-bar";
import { ZoneMap } from "@/components/zone-map";
import { fr } from "@/i18n/fr";
import {
  searchCommunes,
  searchStartAddress,
  type AddressSuggestion,
  type CommuneSuggestion,
} from "@/lib/geo";
import { loadZone, saveZone, type Zone } from "@/lib/my-company";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Button, Card, LinkText, Notice, Screen, ScreenSkeleton, Title, toast } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proZone;
const { colors, font, radius, spacing } = theme;

const MODES: { value: ZoneMode; label: string }[] = [
  { value: "rayon", label: t.modeRadius },
  { value: "communes", label: t.modeCommunes },
  { value: "departements", label: t.modeDepartements },
  { value: "regions", label: t.modeRegions },
  { value: "france", label: t.modeFrance },
];

type Message = { tone: "error" | "success"; text: string } | null;

/**
 * Zone d'intervention (ADR 0125), comme l'étape « Zone » du site : un rayon autour d'une adresse
 * de départ (gardée si seul le rayon change), une liste de communes, ou des départements, des
 * régions ou toute la France avec l'adresse de départ (ADR 0213, set_artisan_zone).
 */
export default function ZoneScreen() {
  const [zone, reload] = useFocusData(loadZone);
  if (zone === undefined) return <ScreenSkeleton header={<TopBar />} />;
  return (
    <Screen onRefresh={reload} header={<TopBar />}>
      <Title>{t.title}</Title>
      <Body muted>{t.lead}</Body>
      {zone === null ? (
        <Notice tone="error">{t.loadError}</Notice>
      ) : (
        <ZoneForm zone={zone} onSaved={reload} />
      )}
    </Screen>
  );
}

function ZoneForm({ zone, onSaved }: { zone: Zone; onSaved: () => Promise<void> }) {
  const [mode, setMode] = useState<ZoneMode>(zone.mode ?? "rayon");
  const [radiusKm, setRadiusKm] = useState<number | null>(
    zone.radiusKm !== null && (ZONE_RADIUS_OPTIONS_KM as readonly number[]).includes(zone.radiusKm)
      ? zone.radiusKm
      : null,
  );
  const [base, setBase] = useState<AddressSuggestion | null>(null);
  const [editingBase, setEditingBase] = useState(!zone.hasBase);
  const [communes, setCommunes] = useState(zone.communes);
  const [territories, setTerritories] = useState(zone.territories);
  const [message, setMessage] = useState<Message>(null);
  const [busy, setBusy] = useState(false);
  const point = base ?? zone.basePoint;
  const withBase = mode !== "communes";

  function chooseMode(next: ZoneMode) {
    setMode(next);
    if (next === zone.mode) return setTerritories(zone.territories);
    // Le territoire de l'adresse de départ est proposé d'emblée.
    const citycode = base?.citycode ?? zone.baseCitycode;
    const own =
      citycode && (next === "departements" || next === "regions")
        ? territoryOfInsee(next, citycode)
        : null;
    setTerritories(own ? [own] : []);
  }

  async function save() {
    setMessage(null);
    if (withBase && !base && !zone.hasBase) {
      return setMessage({ tone: "error", text: t.addressRequired });
    }
    if (mode === "rayon" && radiusKm === null) return setMessage({ tone: "error", text: t.radius });
    if ((mode === "departements" || mode === "regions") && territories.length === 0) {
      return setMessage({ tone: "error", text: t.territoryRequired });
    }
    setBusy(true);
    const result = await saveZone(
      mode === "rayon"
        ? { mode, radiusKm: radiusKm ?? 0, base }
        : mode === "communes"
          ? { mode, communes }
          : mode === "france"
            ? { mode, base }
            : { mode, territories, base },
    );
    setBusy(false);
    if (!result.ok) {
      const fields = result.fields ?? {};
      const text =
        fields.baseLabel || fields.lon || fields.lat || fields.baseCitycode
          ? t.addressRequired
          : (fields.communes ??
            fields.territories ??
            fields.radiusKm ??
            result.error ??
            fr.errors.generic);
      return setMessage({ tone: "error", text });
    }
    toast.success(t.saved);
    setEditingBase(false);
    // Rechargée d'abord : la carte passe à l'adresse enregistrée sans revenir à l'ancienne.
    await onSaved();
    setBase(null);
  }

  function addCommune(c: CommuneSuggestion) {
    setCommunes((current) =>
      current.some((x) => x.code === c.code) ? current : [...current, { code: c.code, nom: c.nom }],
    );
  }

  return (
    <Card>
      <ChoiceGroup<ZoneMode> legend={t.mode} value={mode} options={MODES} onChange={chooseMode} />
      {withBase ? (
        <>
          {!editingBase && (base || zone.baseLabel) ? (
            <View style={styles.base}>
              <MapPin size={18} color={colors["primary-strong"]} />
              <Text style={styles.baseText}>{t.current(base?.label ?? zone.baseLabel ?? "")}</Text>
              <LinkText label={t.change} onPress={() => setEditingBase(true)} />
            </View>
          ) : (
            <AutocompleteField<AddressSuggestion>
              label={t.address}
              hint={t.addressHint}
              search={searchStartAddress}
              itemLabel={(a) => a.label}
              onSelect={(a) => {
                setBase(a);
                setEditingBase(false);
              }}
            />
          )}
          {mode === "rayon" ? (
            <>
              <ChoiceGroup<number>
                legend={t.radius}
                value={radiusKm}
                options={ZONE_RADIUS_OPTIONS_KM.map((km) => ({ value: km, label: t.km(km) }))}
                onChange={setRadiusKm}
                columns={3}
              />
              {point && radiusKm !== null ? (
                <ZoneMap lon={point.lon} lat={point.lat} radiusKm={radiusKm} />
              ) : null}
            </>
          ) : null}
          {mode === "departements" || mode === "regions" ? (
            <TerritoryField
              mode={mode}
              codes={territories}
              onChange={setTerritories}
              labels={{
                search: mode === "regions" ? t.regionSearch : t.departementSearch,
                hint: mode === "regions" ? t.regionSearchHint : t.departementSearchHint,
                remove: t.territoryRemove,
              }}
            />
          ) : null}
          {mode === "france" ? <Body muted>{t.franceNote}</Body> : null}
          {mode === "regions" || mode === "france" ? <Body muted>{t.wideNote}</Body> : null}
        </>
      ) : (
        <>
          {communes.length === 0 ? (
            <Body muted>{t.communesEmpty}</Body>
          ) : (
            <View style={styles.chips}>
              {communes.map((c) => (
                <View key={c.code} style={styles.chip}>
                  <Text style={styles.chipText}>{c.nom}</Text>
                  <Pressable
                    role="button"
                    aria-label={t.communeRemove(c.nom)}
                    onPress={() =>
                      setCommunes((current) => current.filter((x) => x.code !== c.code))
                    }
                    hitSlop={8}
                  >
                    <X size={14} color={colors["primary-strong"]} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
          <AutocompleteField<CommuneSuggestion>
            label={t.communes}
            hint={t.communesHint}
            search={searchCommunes}
            itemLabel={(c) => (c.postcode ? `${c.nom} (${c.postcode})` : c.nom)}
            onSelect={addCommune}
          />
        </>
      )}
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
      <Button label={t.save} onPress={save} loading={busy} />
    </Card>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
    padding: spacing(3),
    borderRadius: radius.input,
    backgroundColor: colors["primary-softer"],
  },
  baseText: { flex: 1, fontFamily: font.medium, fontSize: 14, color: colors.foreground },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.5),
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
    borderRadius: radius.pill,
    backgroundColor: colors["primary-softer"],
  },
  chipText: { fontFamily: font.medium, fontSize: 13, color: colors["primary-strong"] },
});
