import { detectUrgency, MAX_PROJECT_LOTS, parisToday } from "@menao/core";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { Minus, Pencil, Plus, Search, Siren, TriangleAlert } from "lucide-react-native";
import { type ReactNode, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { AutocompleteField } from "@/components/autocomplete-field";
import { ActionScreen, ActionSubmit, RadioCards } from "@/components/pro/action-kit";
import {
  CardHeading,
  FicheButton,
  FicheCard,
  FicheLink,
  FicheTag,
  type FicheTone,
} from "@/components/pro/fiche-kit";
import { ProjectPhotosCard } from "@/components/project-photos-card";
import { PillRow, SelectPill } from "@/components/request-kit";
import { fr } from "@/i18n/fr";
import { formatLongDate, fromIsoDate, toIsoDate } from "@/lib/dates";
import { searchAddresses, searchCommunes } from "@/lib/geo";
import {
  saveAndValidateCriteria,
  saveProjectLots,
  setProjectUrgency,
  type Criteria,
  type ProjectForReview,
  type ProjectPhoto,
} from "@/lib/project";
import { useReferentials } from "@/lib/referentials";
import { Notice } from "@/ui";
import { theme } from "@/ui/theme";

const { colors, font, spacing } = theme;

const r = fr.review;
const LIEUX = ["appartement", "maison", "jardin", "entreprise"] as const;
const SURFACES = ["moins_10", "10_20", "20_50", "plus_50"] as const;
const BUDGETS = ["moins_1000", "1000_5000", "5000_15000", "15000_50000", "plus_50000"] as const;
/** Délai : l'urgence d'abord, puis le début souhaité (ADR 0279). */
const DELAYS = ["urgent", "des_que_possible", "date", "inconnue"] as const;
type Delay = (typeof DELAYS)[number];

/** Bascule d'un code dans une liste (puces à choix multiple). */
function toggle(list: string[], code: string): string[] {
  return list.includes(code) ? list.filter((c) => c !== code) : [...list, code];
}

type Section = "trade" | "site" | "address" | "date";

/**
 * Vérification des critères pré-remplis par l'IA (F-07), d'après la maquette « Vérifiez vos
 * critères » et comme sur le site : chaque carte montre un résumé et un crayon ; la modification
 * se fait dans la carte (Annuler / Enregistrer). « Trouver l'artisan idéal » enregistre le tout,
 * vérifié par la base (métier et ville obligatoires).
 * Écran « Nette » (lot 12) : grand titre, rubriques en cartes, choix en pastilles et bouton collé
 * en bas. Refonte F-130 (maquette « UrgenceMobile », ADR 0279) : bandeau « Demande urgente » en
 * tête, groupe « L'essentiel » (métier, adresse, délai en quatre choix dont « Urgent »), groupe
 * « Votre chantier » (description, chantier, photos), autres métiers en bas.
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
  // Chantier à plusieurs métiers (ADR 0167) : enregistrés au lancement de la recherche.
  const [lots, setLots] = useState<string[]>(project.lotTrades);
  const [allTrades, setAllTrades] = useState(false);
  // Urgence (ADR 0279) : réglée ici, enregistrée au lancement de la recherche si elle a changé.
  const [urgent, setUrgent] = useState(project.urgency.active);
  const [urgencyTouched, setUrgencyTouched] = useState(false);
  const [draftDelay, setDraftDelay] = useState<Delay>(
    project.urgency.active ? "urgent" : (project.criteria.dateMode ?? "inconnue"),
  );
  const set = (patch: Partial<Criteria>) => setDraft((current) => ({ ...current, ...patch }));
  const today = parisToday();
  const tradeWorks = workTypes.filter((w) => w.trade === draft.tradeCode);
  const ready = Boolean(criteria.tradeCode && criteria.ville) && editing === null;
  const labelOf = (list: readonly { code: string; label: string }[], code: string) =>
    list.find((item) => item.code === code)?.label ?? code;

  const delay: Delay = urgent ? "urgent" : (criteria.dateMode ?? "inconnue");
  function edit(section: Section) {
    setDraft(criteria);
    setDraftDelay(delay);
    setEditing(section);
  }
  function cancel() {
    setDraft(criteria);
    setEditing(null);
    setShowPicker(false);
  }
  function save() {
    if (editing === "date") {
      const isUrgent = draftDelay === "urgent";
      setCriteria({
        ...draft,
        dateMode: isUrgent ? "des_que_possible" : draftDelay,
        dateSouhaitee: draftDelay === "date" ? draft.dateSouhaitee : null,
      });
      if (isUrgent !== urgent) {
        setUrgent(isUrgent);
        setUrgencyTouched(true);
      }
    } else {
      setCriteria(draft);
    }
    setEditing(null);
    setShowPicker(false);
  }

  function notUrgent() {
    setUrgent(false);
    setUrgencyTouched(true);
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
    // Urgence changée ici : enregistrée d'abord (urgent : début « dès que possible » en base).
    if (urgencyTouched) {
      const urgencyError = await setProjectUrgency(project.id, urgent);
      if (urgencyError) {
        setSaving(false);
        return setFailure(urgencyError);
      }
    }
    const lotError = await saveProjectLots(
      project.id,
      lots.filter((code) => code !== criteria.tradeCode),
    );
    if (lotError) {
      setSaving(false);
      return setFailure(lotError);
    }
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
          : section === "date"
            ? draftDelay !== "date" || Boolean(draft.dateSouhaitee)
            : true,
  });
  // Autres métiers : ceux proposés d'après la description, puis ceux ajoutés.
  const proposedLots = project.suggestedLots.filter((code) => code !== criteria.tradeCode);
  const listedLots = [
    ...proposedLots,
    ...lots.filter((code) => !proposedLots.includes(code) && code !== criteria.tradeCode),
  ];
  const chosenLots = lots.filter((code) => code !== criteria.tradeCode);
  const lotsFull = chosenLots.length >= MAX_PROJECT_LOTS;
  function toggleLot(code: string) {
    if (lots.includes(code)) return setLots(lots.filter((c) => c !== code));
    if (!lotsFull) setLots([...lots, code]);
  }
  const siteTags = [
    criteria.lieuType ? fr.lieux[criteria.lieuType] : null,
    ...(criteria.workTypeCodes ?? []).map((code) => labelOf(workTypes, code)),
    ...(criteria.roomCodes ?? []).map((code) => labelOf(rooms, code)),
    criteria.surface ? fr.surfaces[criteria.surface] : null,
    criteria.budget ? fr.budgets[criteria.budget] : null,
  ].filter((tag): tag is string => Boolean(tag));
  const dateTag =
    delay === "date" && criteria.dateSouhaitee
      ? r.startsOn(formatLongDate(criteria.dateSouhaitee))
      : r.dateModes[delay];
  // D'où vient l'urgence : le particulier l'a réglée, ou sa description la dit.
  const manual = urgencyTouched || project.urgency.manual === true;
  const excerpt = manual ? null : (detectUrgency(project.description)?.excerpt ?? null);

  return (
    <ActionScreen
      title={r.title}
      lead={project.analyzed ? r.intro : r.noAnalysis}
      footer={
        <>
          {failure && <Notice tone="error">{failure}</Notice>}
          <ActionSubmit
            label={r.submit}
            icon={Search}
            onPress={submit}
            loading={saving}
            disabled={!ready}
            note={editing !== null ? r.editing : !ready ? r.submitHint : undefined}
          />
        </>
      }
    >
      {project.lowConfidence && <Notice tone="info">{r.lowConfidence}</Notice>}
      {photosFailed && <Notice tone="error">{fr.search.errors.photos}</Notice>}

      {urgent ? (
        <View style={styles.urgency}>
          <View style={styles.urgencyIcon}>
            <Siren size={19} color={colors.danger} />
          </View>
          <View style={styles.urgencyText}>
            <Text role="heading" aria-level={2} style={styles.urgencyTitle}>
              {r.urgency.title}
            </Text>
            <Text style={styles.urgencyBody}>
              {manual
                ? r.urgency.manual
                : excerpt
                  ? r.urgency.fromText(excerpt)
                  : r.urgency.fromAnalysis}{" "}
              {r.urgency.body}
            </Text>
            <Pressable
              role="button"
              hitSlop={10}
              disabled={editing !== null}
              onPress={notUrgent}
              style={({ pressed }) => [
                styles.notUrgent,
                editing !== null && styles.locked,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.notUrgentText}>{r.urgency.notUrgent}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      <View style={styles.group}>
        <Text role="heading" aria-level={2} style={styles.groupTitle}>
          {r.groups.essential.title}
        </Text>
        <Text style={styles.groupDescription}>{r.groups.essential.description}</Text>
      </View>
      <EditableCard
        title={r.trade}
        help={r.tradeHelp}
        summary={criteria.tradeCode ? [labelOf(trades, criteria.tradeCode)] : []}
        {...card("trade")}
      >
        <PillRow>
          {trades.map((t) => (
            <SelectPill
              key={t.code}
              single
              label={t.label}
              selected={draft.tradeCode === t.code}
              onPress={() => changeTrade(t.code)}
            />
          ))}
        </PillRow>
        <Text style={styles.label}>{r.works}</Text>
        {draft.tradeCode ? (
          <PillRow>
            {tradeWorks.map((w) => (
              <SelectPill
                key={w.code}
                label={w.label}
                selected={(draft.workTypeCodes ?? []).includes(w.code)}
                onPress={() => set({ workTypeCodes: toggle(draft.workTypeCodes ?? [], w.code) })}
              />
            ))}
          </PillRow>
        ) : (
          <Text style={styles.muted}>{r.worksNeedTrade}</Text>
        )}
      </EditableCard>

      <EditableCard
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
        title={r.date}
        help={r.dateHelp}
        summary={[dateTag]}
        summaryTone={urgent ? "danger" : "primary"}
        {...card("date")}
      >
        <RadioCards
          legend={r.date}
          hideLegend
          options={DELAYS.map((mode) => ({
            value: mode,
            label: r.dateModes[mode],
            detail: r.dateDetails[mode],
          }))}
          value={draftDelay}
          onChange={(mode) => {
            setDraftDelay(mode);
            set({ dateMode: mode === "urgent" ? "des_que_possible" : mode });
            setShowPicker(mode === "date" && Platform.OS === "android");
          }}
        />
        {draftDelay === "date" && (
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

      <View style={styles.group}>
        <Text role="heading" aria-level={2} style={styles.groupTitle}>
          {r.groups.site.title}
        </Text>
        <Text style={styles.groupDescription}>{r.groups.site.description}</Text>
      </View>
      <FicheCard padding={4.5} gap={2.5}>
        <CardHeading title={r.yourText} />
        <Text style={styles.description} numberOfLines={expanded ? undefined : 4}>
          {project.description}
        </Text>
        {project.description.length > 180 && (
          <Pressable role="button" hitSlop={8} onPress={() => setExpanded(!expanded)}>
            <Text style={styles.link}>{expanded ? r.less : r.more}</Text>
          </Pressable>
        )}
      </FicheCard>

      <EditableCard title={r.site} help={r.siteHelp} summary={siteTags} {...card("site")}>
        <Text style={styles.label}>{r.lieu}</Text>
        <PillRow>
          {LIEUX.map((lieu) => (
            <SelectPill
              key={lieu}
              single
              label={fr.lieux[lieu]}
              selected={draft.lieuType === lieu}
              onPress={() => set({ lieuType: draft.lieuType === lieu ? null : lieu })}
            />
          ))}
        </PillRow>
        <Text style={styles.label}>{r.rooms}</Text>
        <PillRow>
          {rooms.map((room) => (
            <SelectPill
              key={room.code}
              label={room.label}
              selected={(draft.roomCodes ?? []).includes(room.code)}
              onPress={() => set({ roomCodes: toggle(draft.roomCodes ?? [], room.code) })}
            />
          ))}
        </PillRow>
        <Text style={styles.label}>{r.surface}</Text>
        <PillRow>
          {SURFACES.map((surface) => (
            <SelectPill
              key={surface}
              single
              label={fr.surfaces[surface]}
              selected={draft.surface === surface}
              onPress={() => set({ surface: draft.surface === surface ? null : surface })}
            />
          ))}
        </PillRow>
        <Text style={styles.label}>{r.budget}</Text>
        <PillRow>
          {BUDGETS.map((budget) => (
            <SelectPill
              key={budget}
              single
              label={fr.budgets[budget]}
              selected={draft.budget === budget}
              onPress={() => set({ budget: draft.budget === budget ? null : budget })}
            />
          ))}
        </PillRow>
      </EditableCard>

      <ProjectPhotosCard projectId={project.id} initial={photos} advise={project.advisePhotos} />

      {criteria.tradeCode ? (
        <FicheCard padding={4.5} gap={3}>
          <CardHeading title={r.lots.title} />
          <Text style={styles.muted}>{proposedLots.length ? r.lots.suggested : r.lots.none}</Text>
          {listedLots.length > 0 ? (
            <PillRow>
              {listedLots.map((code) => (
                <SelectPill
                  key={code}
                  label={labelOf(trades, code)}
                  selected={lots.includes(code)}
                  onPress={() => toggleLot(code)}
                />
              ))}
            </PillRow>
          ) : null}
          <FicheLink
            icon={allTrades ? Minus : Plus}
            label={allTrades ? r.lots.hide : r.lots.add}
            onPress={() => setAllTrades(!allTrades)}
          />
          {allTrades ? (
            <PillRow>
              {trades
                .filter((t) => t.code !== criteria.tradeCode && !listedLots.includes(t.code))
                .map((t) => (
                  <SelectPill
                    key={t.code}
                    label={t.label}
                    selected={lots.includes(t.code)}
                    onPress={() => toggleLot(t.code)}
                  />
                ))}
            </PillRow>
          ) : null}
          <Text style={styles.hint}>{lotsFull ? r.lots.limit : r.lots.independent}</Text>
        </FicheCard>
      ) : null}

      {urgent ? (
        <View style={styles.danger}>
          <TriangleAlert size={15} color={colors["muted-foreground"]} />
          <Text style={styles.dangerText}>{fr.search.urgency.danger}</Text>
        </View>
      ) : null}
    </ActionScreen>
  );
}

/**
 * Carte à résumé de la maquette : titre (Inter Tight), crayon, pastilles du résumé ; en
 * modification, le contenu et « Annuler » / « Enregistrer ». Les autres cartes sont verrouillées
 * pendant ce temps.
 */
function EditableCard({
  title,
  help,
  summary,
  summaryTone = "primary",
  editing,
  locked,
  canSave,
  onEdit,
  onCancel,
  onSave,
  children,
}: {
  title: string;
  help: string;
  summary: string[];
  summaryTone?: FicheTone;
  editing: boolean;
  locked: boolean;
  canSave: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  children: ReactNode;
}) {
  return (
    <FicheCard padding={4.5} gap={3}>
      <CardHeading
        title={title}
        right={
          !editing ? (
            <Pressable
              role="button"
              aria-label={r.editLabel(title)}
              aria-disabled={locked}
              disabled={locked}
              hitSlop={10}
              onPress={onEdit}
              style={({ pressed }) => [
                styles.edit,
                locked && styles.locked,
                pressed && styles.pressed,
              ]}
            >
              <Pencil size={18} color={colors["primary-strong"]} />
            </Pressable>
          ) : null
        }
      />
      {editing ? (
        <>
          <Text style={styles.muted}>{help}</Text>
          {children}
          <View style={styles.editActions}>
            <FicheButton label={r.cancel} variant="secondary" grow onPress={onCancel} />
            <FicheButton label={r.save} grow onPress={onSave} disabled={!canSave} />
          </View>
        </>
      ) : summary.length > 0 ? (
        <View style={styles.tags}>
          {summary.map((tag) => (
            <FicheTag key={tag} text={tag} tone={summaryTone} />
          ))}
        </View>
      ) : (
        <Text style={styles.muted}>{r.notSet}</Text>
      )}
    </FicheCard>
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
        <Text style={styles.muted}>{value ? r.startsOn(formatLongDate(value)) : today}</Text>
      </View>
    );
  }
  return (
    <View style={styles.selected}>
      {value && <Text style={styles.selectedValue}>{r.startsOn(formatLongDate(value))}</Text>}
      {Platform.OS === "android" && (
        <FicheButton label={r.pickDate} variant="secondary" onPress={onOpenAndroid} />
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
  edit: { marginVertical: -spacing(1) },
  locked: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
  editActions: { flexDirection: "row", gap: spacing(3) },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  label: { fontFamily: font.semibold, fontSize: 14, color: colors.foreground },
  muted: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.label },
  description: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.foreground },
  link: { fontFamily: font.semibold, fontSize: 14, color: colors["primary-strong"] },
  selected: { gap: spacing(1.5) },
  selectedRow: { flexDirection: "row", alignItems: "center", gap: spacing(3) },
  selectedValue: { flex: 1, fontFamily: font.regular, fontSize: 16, color: colors.foreground },
  change: { fontFamily: font.semibold, fontSize: 15, color: colors["primary-strong"] },
  hint: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
  group: { gap: 2, marginTop: spacing(2) },
  groupTitle: {
    fontFamily: font.display,
    fontSize: 21,
    letterSpacing: -0.42,
    color: colors.foreground,
  },
  groupDescription: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.label },
  urgency: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing(3),
    padding: spacing(3.5),
    borderRadius: 16,
    backgroundColor: colors["danger-soft"],
  },
  urgencyIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  urgencyText: { flex: 1, gap: 3 },
  urgencyTitle: { fontFamily: font.display, fontSize: 17, color: colors.danger },
  urgencyBody: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.label },
  notUrgent: { alignSelf: "flex-start", paddingVertical: spacing(1.5) },
  notUrgentText: {
    fontFamily: font.semibold,
    fontSize: 14,
    color: colors.foreground,
    textDecorationLine: "underline",
  },
  danger: { flexDirection: "row", alignItems: "flex-start", gap: spacing(2) },
  dangerText: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
});
