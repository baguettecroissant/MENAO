import { parisToday } from "@menao/core";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { Sparkles } from "lucide-react-native";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { AutocompleteField } from "@/components/autocomplete-field";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { formatLongDate, fromIsoDate, toIsoDate } from "@/lib/dates";
import { searchAddresses, searchCommunes } from "@/lib/geo";
import { saveAndValidateCriteria, type Criteria, type ProjectForReview } from "@/lib/project";
import { useReferentials } from "@/lib/referentials";
import { Body, Button, Card, Chip, LinkText, Notice, Screen } from "@/ui";
import { theme } from "@/ui/theme";

const r = fr.review;
const LIEUX = ["appartement", "maison", "jardin", "entreprise"] as const;
const SURFACES = ["moins_10", "10_20", "20_50", "plus_50"] as const;
const DATE_MODES = ["des_que_possible", "date", "inconnue"] as const;

/** Bascule d'un code dans une liste (puces à choix multiple). */
function toggle(list: string[], code: string): string[] {
  return list.includes(code) ? list.filter((c) => c !== code) : [...list, code];
}

/**
 * Vérification des critères pré-remplis par l'IA (F-07), comme sur le site : métier et travaux,
 * chantier, adresse (ville puis adresse exacte de cette ville), date de début. « Trouver
 * l'artisan idéal » enregistre le tout, vérifié par la base (métier et ville obligatoires).
 */
export function CriteriaReview({ project }: { project: ProjectForReview }) {
  const { trades, workTypes, rooms } = useReferentials();
  const [criteria, setCriteria] = useState<Criteria>(project.criteria);
  const [expanded, setExpanded] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const set = (patch: Partial<Criteria>) => setCriteria((current) => ({ ...current, ...patch }));
  const today = parisToday();
  const tradeWorks = workTypes.filter((w) => w.trade === criteria.tradeCode);
  const ready = Boolean(criteria.tradeCode && criteria.ville);

  function changeTrade(code: string) {
    const tradeCode = criteria.tradeCode === code ? null : code;
    // Les travaux suivent le métier : ceux d'un autre métier sont retirés.
    const allowed = new Set(workTypes.filter((w) => w.trade === tradeCode).map((w) => w.code));
    set({ tradeCode, workTypeCodes: (criteria.workTypeCodes ?? []).filter((c) => allowed.has(c)) });
  }

  async function submit() {
    setFailure(null);
    setSaving(true);
    const error = await saveAndValidateCriteria(project.id, criteria);
    setSaving(false);
    if (error) return setFailure(error);
    router.push({ pathname: "/projet/[id]/artisans", params: { id: project.id } });
  }

  return (
    <Screen header={<TopBar title={r.title} />}>
      <Body muted>{project.analyzed ? r.intro : r.noAnalysis}</Body>
      {project.lowConfidence && <Notice tone="info">{r.lowConfidence}</Notice>}

      <Card tone="soft">
        <View style={styles.cardTitle}>
          <Sparkles size={16} color={theme.colors.primary} />
          <Text style={styles.heading}>{r.yourText}</Text>
        </View>
        <Text style={styles.description} numberOfLines={expanded ? undefined : 4}>
          {project.description}
        </Text>
        {project.description.length > 180 && (
          <LinkText label={expanded ? r.less : r.more} onPress={() => setExpanded(!expanded)} />
        )}
      </Card>

      <Card>
        <Text style={styles.heading}>{r.trade}</Text>
        <Body muted>{r.tradeHelp}</Body>
        <View style={styles.chips}>
          {trades.map((t) => (
            <Chip
              key={t.code}
              label={t.label}
              selected={criteria.tradeCode === t.code}
              onPress={() => changeTrade(t.code)}
            />
          ))}
        </View>
        <Text style={styles.label}>{r.works}</Text>
        {criteria.tradeCode ? (
          <View style={styles.chips}>
            {tradeWorks.map((w) => (
              <Chip
                key={w.code}
                label={w.label}
                selected={(criteria.workTypeCodes ?? []).includes(w.code)}
                onPress={() => set({ workTypeCodes: toggle(criteria.workTypeCodes ?? [], w.code) })}
              />
            ))}
          </View>
        ) : (
          <Body muted>{r.worksNeedTrade}</Body>
        )}
      </Card>

      <Card>
        <Text style={styles.heading}>{r.site}</Text>
        <Text style={styles.label}>{r.lieu}</Text>
        <View style={styles.chips}>
          {LIEUX.map((lieu) => (
            <Chip
              key={lieu}
              label={fr.lieux[lieu]}
              selected={criteria.lieuType === lieu}
              onPress={() => set({ lieuType: criteria.lieuType === lieu ? null : lieu })}
            />
          ))}
        </View>
        <Text style={styles.label}>{r.rooms}</Text>
        <View style={styles.chips}>
          {rooms.map((room) => (
            <Chip
              key={room.code}
              label={room.label}
              selected={(criteria.roomCodes ?? []).includes(room.code)}
              onPress={() => set({ roomCodes: toggle(criteria.roomCodes ?? [], room.code) })}
            />
          ))}
        </View>
        <Text style={styles.label}>{r.surface}</Text>
        <View style={styles.chips}>
          {SURFACES.map((surface) => (
            <Chip
              key={surface}
              label={fr.surfaces[surface]}
              selected={criteria.surface === surface}
              onPress={() => set({ surface: criteria.surface === surface ? null : surface })}
            />
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.heading}>{r.address}</Text>
        {criteria.ville ? (
          <Selected
            label={r.city}
            value={`${criteria.ville.nom}${criteria.ville.codePostal ? ` (${criteria.ville.codePostal})` : ""}`}
            // Changer de ville retire l'adresse exacte, qui doit être dans la ville choisie.
            onChange={() => set({ ville: null, adresse: null })}
          />
        ) : (
          <AutocompleteField
            label={r.city}
            placeholder={r.cityPlaceholder}
            search={(q, signal) => searchCommunes(q, signal)}
            itemLabel={(c) => `${c.nom}${c.postcode ? ` (${c.postcode})` : ""}`}
            onSelect={(c) =>
              set({
                ville: {
                  code: c.code,
                  nom: c.nom,
                  codePostal: c.postcode ?? null,
                  lon: c.lon,
                  lat: c.lat,
                },
                adresse: null,
              })
            }
          />
        )}
        {criteria.ville &&
          (criteria.adresse ? (
            <Selected
              label={r.street}
              value={criteria.adresse.label}
              onChange={() => set({ adresse: null })}
            />
          ) : (
            <AutocompleteField
              label={r.street}
              placeholder={r.streetPlaceholder}
              hint={r.streetHint}
              search={(q, signal) => searchAddresses(q, criteria.ville?.code ?? "", signal)}
              itemLabel={(a) => a.label}
              onSelect={(a) => set({ adresse: a })}
            />
          ))}
      </Card>

      <Card>
        <Text style={styles.heading}>{r.date}</Text>
        <View style={styles.chips}>
          {DATE_MODES.map((mode) => (
            <Chip
              key={mode}
              label={r.dateModes[mode]}
              selected={criteria.dateMode === mode}
              onPress={() => {
                set({ dateMode: mode });
                setShowPicker(mode === "date" && Platform.OS === "android");
              }}
            />
          ))}
        </View>
        {criteria.dateMode === "date" && (
          <DatePicker
            value={criteria.dateSouhaitee ?? null}
            today={today}
            showAndroid={showPicker}
            onOpenAndroid={() => setShowPicker(true)}
            onChange={(iso) => {
              setShowPicker(false);
              set({ dateSouhaitee: iso });
            }}
          />
        )}
      </Card>

      {failure && <Notice tone="error">{failure}</Notice>}
      <Button label={r.submit} onPress={submit} loading={saving} disabled={!ready} />
      {!ready && <Text style={styles.hint}>{r.submitHint}</Text>}
    </Screen>
  );
}

/** Valeur choisie (ville, adresse), avec un lien pour la changer. */
function Selected({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: () => void;
}) {
  return (
    <View style={styles.selected}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.selectedRow}>
        <Text style={styles.selectedValue}>{value}</Text>
        <Pressable role="button" onPress={onChange} hitSlop={8}>
          <Text style={styles.change}>{r.change}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Date de début : calendrier intégré sur iPhone, fenêtre du système sur Android, saisie
 * AAAA-MM-JJ sur la version web (développement). Aucune date passée.
 */
function DatePicker({
  value,
  today,
  showAndroid,
  onOpenAndroid,
  onChange,
}: {
  value: string | null;
  today: string;
  showAndroid: boolean;
  onOpenAndroid: () => void;
  onChange: (iso: string) => void;
}) {
  const current = fromIsoDate(value ?? today);
  if (Platform.OS === "web") {
    return (
      <View style={styles.selected}>
        <Text style={styles.label}>{r.pickDate}</Text>
        <Body muted>{value ? r.startsOn(formatLongDate(value)) : today}</Body>
      </View>
    );
  }
  return (
    <View style={styles.selected}>
      {value && <Text style={styles.selectedValue}>{r.startsOn(formatLongDate(value))}</Text>}
      {Platform.OS === "android" && (
        <Button label={r.pickDate} variant="secondary" onPress={onOpenAndroid} />
      )}
      {(Platform.OS === "ios" || showAndroid) && (
        <DateTimePicker
          value={current}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          minimumDate={fromIsoDate(today)}
          locale="fr-FR"
          accentColor={theme.colors.primary}
          onChange={(event, date) => {
            if (event.type === "set" && date) onChange(toIsoDate(date));
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardTitle: { flexDirection: "row", alignItems: "center", gap: theme.spacing(2) },
  heading: { fontFamily: theme.font.medium, fontSize: 17, color: theme.colors.foreground },
  label: { fontFamily: theme.font.medium, fontSize: 14, color: theme.colors.foreground },
  description: {
    fontFamily: theme.font.regular,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.foreground,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing(2) },
  selected: { gap: theme.spacing(1.5) },
  selectedRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing(3) },
  selectedValue: {
    flex: 1,
    fontFamily: theme.font.regular,
    fontSize: 15,
    color: theme.colors.foreground,
  },
  change: { fontFamily: theme.font.medium, fontSize: 15, color: theme.colors["primary-strong"] },
  hint: {
    fontFamily: theme.font.regular,
    fontSize: 13,
    textAlign: "center",
    color: theme.colors["muted-foreground"],
  },
});
