import { parisToday } from "@menao/core";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import {
  CalendarDays,
  type LucideIcon,
  MapPin,
  Pencil,
  Search,
  Sparkles,
  UserRound,
  Wrench,
} from "lucide-react-native";
import { type ReactNode, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { AutocompleteField } from "@/components/autocomplete-field";
import { ProjectPhotosCard } from "@/components/project-photos-card";
import { RadioGroup } from "@/components/radio-group";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { formatLongDate, fromIsoDate, toIsoDate } from "@/lib/dates";
import { searchAddresses, searchCommunes } from "@/lib/geo";
import {
  saveAndValidateCriteria,
  type Criteria,
  type ProjectForReview,
  type ProjectPhoto,
} from "@/lib/project";
import { useReferentials } from "@/lib/referentials";
import { Body, Button, Card, Chip, LinkText, Notice, Screen } from "@/ui";
import { theme } from "@/ui/theme";

const r = fr.review;
const LIEUX = ["appartement", "maison", "jardin", "entreprise"] as const;
const SURFACES = ["moins_10", "10_20", "20_50", "plus_50"] as const;
const BUDGETS = ["moins_1000", "1000_5000", "5000_15000", "15000_50000", "plus_50000"] as const;
const DATE_MODES = ["des_que_possible", "date", "inconnue"] as const;

/** Bascule d'un code dans une liste (puces à choix multiple). */
function toggle(list: string[], code: string): string[] {
  return list.includes(code) ? list.filter((c) => c !== code) : [...list, code];
}

type Section = "trade" | "site" | "address" | "date";

/**
 * Vérification des critères pré-remplis par l'IA (F-07), d'après la maquette « Vérifiez vos
 * critères » et comme sur le site : chaque carte montre un résumé et un crayon ; la modification
 * se fait dans la carte (Annuler / Enregistrer). Métier et travaux, chantier, adresse (ville puis
 * adresse exacte de cette ville), date de début, photos. « Trouver l'artisan idéal » enregistre le
 * tout, vérifié par la base (métier et ville obligatoires).
 */
export function CriteriaReview({
  project,
  photos,
  photosFailed,
}: {
  project: ProjectForReview;
  photos: ProjectPhoto[];
  /** Des photos jointes à la saisie n'ont pas pu être ajoutées au projet. */
  photosFailed: boolean;
}) {
  const { trades, workTypes, rooms } = useReferentials();
  const [criteria, setCriteria] = useState<Criteria>(project.criteria);
  // Carte en cours de modification : brouillon validé par « Enregistrer ». Le métier ou la ville
  // manquants ouvrent directement leur carte.
  const [editing, setEditing] = useState<Section | null>(
    !project.criteria.tradeCode ? "trade" : !project.criteria.ville ? "address" : null,
  );
  const [draft, setDraft] = useState<Criteria>(project.criteria);
  const [expanded, setExpanded] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const set = (patch: Partial<Criteria>) => setDraft((current) => ({ ...current, ...patch }));
  const today = parisToday();
  const tradeWorks = workTypes.filter((w) => w.trade === draft.tradeCode);
  const ready = Boolean(criteria.tradeCode && criteria.ville) && editing === null;
  const labelOf = (list: readonly { code: string; label: string }[], code: string) =>
    list.find((item) => item.code === code)?.label ?? code;

  function edit(section: Section) {
    setDraft(criteria);
    setEditing(section);
  }
  function cancel() {
    setDraft(criteria);
    setEditing(null);
    setShowPicker(false);
  }
  function save() {
    setCriteria(draft);
    setEditing(null);
    setShowPicker(false);
  }

  function changeTrade(code: string) {
    const tradeCode = draft.tradeCode === code ? null : code;
    // Les travaux suivent le métier : ceux d'un autre métier sont retirés.
    const allowed = new Set(workTypes.filter((w) => w.trade === tradeCode).map((w) => w.code));
    set({ tradeCode, workTypeCodes: (draft.workTypeCodes ?? []).filter((c) => allowed.has(c)) });
  }

  async function submit() {
    setFailure(null);
    setSaving(true);
    const error = await saveAndValidateCriteria(project.id, criteria);
    setSaving(false);
    if (error) return setFailure(error);
    router.push({ pathname: "/projet/[id]/artisans", params: { id: project.id } });
  }

  const card = (section: Section) => ({
    editing: editing === section,
    locked: editing !== null && editing !== section,
    onEdit: () => edit(section),
    onCancel: cancel,
    onSave: save,
    // Pas de carte « Artisan recherché » enregistrée sans métier, ni d'adresse sans ville.
    canSave:
      section === "trade"
        ? Boolean(draft.tradeCode)
        : section === "address"
          ? Boolean(draft.ville)
          : true,
  });
  const siteTags = [
    criteria.lieuType ? fr.lieux[criteria.lieuType] : null,
    ...(criteria.workTypeCodes ?? []).map((code) => labelOf(workTypes, code)),
    ...(criteria.roomCodes ?? []).map((code) => labelOf(rooms, code)),
    criteria.surface ? fr.surfaces[criteria.surface] : null,
    criteria.budget ? fr.budgets[criteria.budget] : null,
  ].filter((tag): tag is string => Boolean(tag));
  const dateTag =
    criteria.dateMode === "date" && criteria.dateSouhaitee
      ? r.startsOn(formatLongDate(criteria.dateSouhaitee))
      : r.dateModes[criteria.dateMode ?? "des_que_possible"];

  return (
    <Screen header={<TopBar title={r.title} />}>
      <Body muted>{project.analyzed ? r.intro : r.noAnalysis}</Body>
      {project.lowConfidence && <Notice tone="info">{r.lowConfidence}</Notice>}
      {photosFailed && <Notice tone="error">{fr.search.errors.photos}</Notice>}

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

      <EditableCard
        icon={UserRound}
        title={r.trade}
        help={r.tradeHelp}
        summary={criteria.tradeCode ? [labelOf(trades, criteria.tradeCode)] : []}
        {...card("trade")}
      >
        <View style={styles.chips}>
          {trades.map((t) => (
            <Chip
              key={t.code}
              label={t.label}
              selected={draft.tradeCode === t.code}
              onPress={() => changeTrade(t.code)}
            />
          ))}
        </View>
        <Text style={styles.label}>{r.works}</Text>
        {draft.tradeCode ? (
          <View style={styles.chips}>
            {tradeWorks.map((w) => (
              <Chip
                key={w.code}
                label={w.label}
                selected={(draft.workTypeCodes ?? []).includes(w.code)}
                onPress={() => set({ workTypeCodes: toggle(draft.workTypeCodes ?? [], w.code) })}
              />
            ))}
          </View>
        ) : (
          <Body muted>{r.worksNeedTrade}</Body>
        )}
      </EditableCard>

      <EditableCard
        icon={Wrench}
        title={r.site}
        help={r.siteHelp}
        summary={siteTags}
        {...card("site")}
      >
        <Text style={styles.label}>{r.lieu}</Text>
        <View style={styles.chips}>
          {LIEUX.map((lieu) => (
            <Chip
              key={lieu}
              label={fr.lieux[lieu]}
              selected={draft.lieuType === lieu}
              onPress={() => set({ lieuType: draft.lieuType === lieu ? null : lieu })}
            />
          ))}
        </View>
        <Text style={styles.label}>{r.rooms}</Text>
        <View style={styles.chips}>
          {rooms.map((room) => (
            <Chip
              key={room.code}
              label={room.label}
              selected={(draft.roomCodes ?? []).includes(room.code)}
              onPress={() => set({ roomCodes: toggle(draft.roomCodes ?? [], room.code) })}
            />
          ))}
        </View>
        <Text style={styles.label}>{r.surface}</Text>
        <View style={styles.chips}>
          {SURFACES.map((surface) => (
            <Chip
              key={surface}
              label={fr.surfaces[surface]}
              selected={draft.surface === surface}
              onPress={() => set({ surface: draft.surface === surface ? null : surface })}
            />
          ))}
        </View>
        <Text style={styles.label}>{r.budget}</Text>
        <View style={styles.chips}>
          {BUDGETS.map((budget) => (
            <Chip
              key={budget}
              label={fr.budgets[budget]}
              selected={draft.budget === budget}
              onPress={() => set({ budget: draft.budget === budget ? null : budget })}
            />
          ))}
        </View>
      </EditableCard>

      <EditableCard
        icon={MapPin}
        title={r.address}
        help={r.addressHelp}
        summary={[
          criteria.ville
            ? `${criteria.ville.nom}${criteria.ville.codePostal ? ` (${criteria.ville.codePostal})` : ""}`
            : null,
          criteria.adresse?.label ?? null,
        ].filter((tag): tag is string => Boolean(tag))}
        {...card("address")}
      >
        {draft.ville ? (
          <Selected
            label={r.city}
            value={`${draft.ville.nom}${draft.ville.codePostal ? ` (${draft.ville.codePostal})` : ""}`}
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
        {draft.ville &&
          (draft.adresse ? (
            <Selected
              label={r.street}
              value={draft.adresse.label}
              onChange={() => set({ adresse: null })}
            />
          ) : (
            <AutocompleteField
              label={r.street}
              placeholder={r.streetPlaceholder}
              hint={r.streetHint}
              search={(q, signal) => searchAddresses(q, draft.ville?.code ?? "", signal)}
              itemLabel={(a) => a.label}
              onSelect={(a) => set({ adresse: a })}
            />
          ))}
      </EditableCard>

      <EditableCard
        icon={CalendarDays}
        title={r.date}
        help={r.dateHelp}
        summary={[dateTag]}
        {...card("date")}
      >
        <RadioGroup
          legend={r.date}
          options={DATE_MODES.map((mode) => ({ value: mode, label: r.dateModes[mode] }))}
          value={draft.dateMode ?? null}
          onChange={(mode) => {
            set({ dateMode: mode });
            setShowPicker(mode === "date" && Platform.OS === "android");
          }}
        />
        {draft.dateMode === "date" && (
          <DatePicker
            value={draft.dateSouhaitee ?? null}
            today={today}
            showAndroid={showPicker}
            onOpenAndroid={() => setShowPicker(true)}
            onChange={(iso) => {
              setShowPicker(false);
              set({ dateSouhaitee: iso });
            }}
          />
        )}
      </EditableCard>

      <ProjectPhotosCard projectId={project.id} initial={photos} advise={project.advisePhotos} />

      {failure && <Notice tone="error">{failure}</Notice>}
      <Button label={r.submit} icon={Search} onPress={submit} loading={saving} disabled={!ready} />
      {editing !== null ? (
        <Text style={styles.hint}>{r.editing}</Text>
      ) : !ready ? (
        <Text style={styles.hint}>{r.submitHint}</Text>
      ) : null}
    </Screen>
  );
}

/**
 * Carte à résumé de la maquette : titre avec icône, crayon, puces du résumé ; en modification, le
 * contenu et « Annuler » / « Enregistrer ». Les autres cartes sont verrouillées pendant ce temps.
 */
function EditableCard({
  icon: Icon,
  title,
  help,
  summary,
  editing,
  locked,
  canSave,
  onEdit,
  onCancel,
  onSave,
  children,
}: {
  icon: LucideIcon;
  title: string;
  help: string;
  summary: string[];
  editing: boolean;
  locked: boolean;
  canSave: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  children: ReactNode;
}) {
  return (
    <Card>
      <View style={styles.cardHead}>
        <Icon size={18} color={theme.colors.primary} />
        <Text role="heading" style={[styles.heading, styles.cardHeading]}>
          {title}
        </Text>
        {!editing ? (
          <Pressable
            role="button"
            aria-label={r.editLabel(title)}
            aria-disabled={locked}
            disabled={locked}
            hitSlop={8}
            onPress={onEdit}
            style={({ pressed }) => [locked && styles.locked, pressed && styles.pressed]}
          >
            <Pencil size={18} color={theme.colors["primary-strong"]} />
          </Pressable>
        ) : null}
      </View>
      {editing ? (
        <>
          <Body muted>{help}</Body>
          {children}
          <View style={styles.editActions}>
            <View style={styles.editAction}>
              <Button label={r.cancel} variant="secondary" onPress={onCancel} />
            </View>
            <View style={styles.editAction}>
              <Button label={r.save} onPress={onSave} disabled={!canSave} />
            </View>
          </View>
        </>
      ) : summary.length > 0 ? (
        <View style={styles.chips}>
          {summary.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Body muted>{r.notSet}</Body>
      )}
    </Card>
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
  cardHead: { flexDirection: "row", alignItems: "center", gap: theme.spacing(2) },
  cardHeading: { flex: 1 },
  locked: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
  editActions: { flexDirection: "row", gap: theme.spacing(3) },
  editAction: { flex: 1 },
  tag: {
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors["primary-soft"],
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(1.5),
  },
  tagText: { fontFamily: theme.font.medium, fontSize: 13, color: theme.colors["primary-strong"] },
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
