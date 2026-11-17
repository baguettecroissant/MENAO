import * as Linking from "expo-linking";
import { router } from "expo-router";
import {
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronRight,
  MessageSquareText,
  Phone,
  Play,
  RotateCcw,
  type LucideIcon,
} from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { PageHead } from "@/components/pro/dossier-kit";
import {
  FicheButton,
  FicheCard,
  FicheScreen,
  FicheSkeleton,
  FicheTag,
  PillTabs,
} from "@/components/pro/fiche-kit";
import { SecretaryTestCall } from "@/components/pro/secretary-test-call";
import { ProgressBar, SwitchCard, ToolField } from "@/components/pro/tools-kit";
import { Segmented } from "@/components/segmented";
import { withTeamPermission } from "@/components/team-gate";
import { ExampleLock } from "@/components/examples";
import { fr } from "@/i18n/fr";
import { useExamplesActive } from "@/lib/examples";
import { formatDayLabel, formatTime, formatWeekdayDay, parisDateTime } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import {
  loadSecretary,
  markSecretaryCall,
  saveSecretarySettings,
  type Secretary,
  type SecretaryCall,
  type SecretarySettings,
} from "@/lib/secretary";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice, Tappable, toast } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proSecretary;
const { colors, font, spacing } = theme;
const VISITS = [30, 60, 90, 120] as const;
type View_ = "todo" | "done" | "settings";
type Included = Extract<Secretary, { included: true }>;

const when = (iso: string) => `${formatDayLabel(iso)} · ${formatTime(iso)}`;
/** « 0612345678 » ou « +33612345678 » → « 06 12 34 56 78 » ; un autre format est laissé tel quel. */
function phone(value: string): string {
  const digits = value.replace(/^\+33/, "0").replace(/\D/g, "");
  return digits.length === 10 ? digits.replace(/(\d{2})(?=\d)/g, "$1 ") : value;
}

/**
 * Rubrique « Secrétaire » dans l'application (lot 68, ADR 0362, maquette « SecretaireApp »), comme
 * sur le site (ADR 0244) : les appels à traiter (appeler, voir dans l'agenda, marquer traité),
 * l'historique, puis les réglages et l'essai. Patron et chef d'équipe. Aucun achat : ni
 * « Recharger », ni lien vers les formules (règle 10).
 */
function SecretaryScreen() {
  const [secretary, reload] = useFocusData(loadSecretary);
  const [view, setView] = useState<View_>("todo");

  if (secretary === undefined) return <FicheSkeleton />;
  if (secretary === null) {
    return (
      <FicheScreen onRefresh={reload}>
        <PageHead title={t.title} />
        <Notice tone="error">{fr.errors.generic}</Notice>
      </FicheScreen>
    );
  }
  if (!secretary.included) {
    return (
      <FicheScreen onRefresh={reload}>
        <PageHead title={t.title} />
        <FicheCard padding={4.5} gap={2.5}>
          <Text style={styles.cardTitle}>{t.notIncluded.title}</Text>
          <Text style={styles.text}>{t.notIncluded.text}</Text>
          <Text style={styles.soft}>{t.notIncluded.note}</Text>
        </FicheCard>
      </FicheScreen>
    );
  }
  if (view === "settings") {
    return <Settings secretary={secretary} view={view} onView={setView} onSaved={reload} />;
  }

  const rows = view === "done" ? secretary.done : secretary.todo;
  return (
    <FicheScreen onRefresh={reload}>
      <PageHead title={t.title} />
      <Figures secretary={secretary} />
      <Tabs secretary={secretary} view={view} onView={setView} />
      {rows.length === 0 ? (
        <Text style={styles.text}>{view === "done" ? t.doneEmpty : t.todoEmpty}</Text>
      ) : (
        rows.map((call) => <CallCard key={call.id} call={call} onChanged={reload} />)
      )}
    </FicheScreen>
  );
}

function Figures({ secretary }: { secretary: Included }) {
  const { figures, gauge } = secretary;
  const cell = (value: number, label: string, danger = false) => (
    <View style={styles.figure}>
      <Text style={[styles.figureValue, danger && styles.danger]}>{value}</Text>
      <Text style={styles.figureLabel}>{label}</Text>
    </View>
  );
  return (
    <View style={styles.figures} role="group" aria-label={t.figuresLabel}>
      {cell(figures.toHandle, t.figures.toHandle(figures.urgent))}
      {cell(figures.monthAppointments, t.figures.appointments)}
      {cell(gauge.remainingMinutes, t.figures.minutes, gauge.level === "epuise")}
    </View>
  );
}

function Tabs({
  secretary,
  view,
  onView,
}: {
  secretary: Included;
  view: View_;
  onView: (view: View_) => void;
}) {
  return (
    <PillTabs<View_>
      label={t.tabsLabel}
      options={[
        { value: "todo", label: t.tabs.todo, badge: secretary.todo.length || undefined },
        { value: "done", label: t.tabs.done },
        { value: "settings", label: t.tabs.settings },
      ]}
      value={view}
      onChange={onView}
    />
  );
}

/** Un appel : qui, pourquoi, quand, puis « Appeler », « Agenda » et « Traité ». */
function CallCard({ call, onChanged }: { call: SecretaryCall; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const examples = useExamplesActive();
  const appointment = call.appointmentAt;
  const done = call.doneAt !== null;
  const Icon = appointment ? CalendarCheck : MessageSquareText;

  async function toggle() {
    haptic.select();
    setBusy(true);
    const ok = await markSecretaryCall(call.id, !done);
    await onChanged();
    setBusy(false);
    if (!ok) toast.info(fr.errors.generic);
  }

  const action = (ActionIcon: LucideIcon, label: string, onPress: () => void, primary = false) => (
    <Pressable
      role="button"
      aria-label={label}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        primary ? styles.actionPrimary : styles.actionOutline,
        (pressed || busy) && styles.pressed,
      ]}
    >
      <ActionIcon
        size={16}
        strokeWidth={2.2}
        color={primary ? colors["primary-foreground"] : colors.foreground}
      />
      <Text style={[styles.actionText, primary && styles.actionTextPrimary]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={[styles.call, done && styles.callDone]}>
      <View style={styles.callHead}>
        <View style={[styles.callIcon, appointment ? styles.iconSuccess : styles.iconPrimary]}>
          <Icon size={20} color={appointment ? colors.success : colors["primary-strong"]} />
        </View>
        <View style={styles.callText}>
          <View style={styles.callWho}>
            <Text style={styles.callName}>{call.callerName}</Text>
            {call.city ? <Text style={styles.meta}>{call.city}</Text> : null}
            {call.urgent ? <FicheTag text={t.urgent} tone="danger" /> : null}
          </View>
          <Text style={[styles.callState, appointment ? styles.success : null]}>
            {appointment
              ? t.appointmentTaken(`${formatWeekdayDay(appointment)} à ${formatTime(appointment)}`)
              : t.toCallBack}
          </Text>
          <Text style={styles.reason}>« {call.reason} »</Text>
          <Text style={styles.meta}>
            {when(call.createdAt)} · {phone(call.callerPhone)}
          </Text>
        </View>
      </View>
      <ExampleLock locked={examples}>
        <View style={styles.actions}>
          {action(
            Phone,
            t.call,
            () => void Linking.openURL(`tel:${call.callerPhone.replace(/[^\d+]/g, "")}`),
            true,
          )}
          {appointment
            ? action(CalendarDays, t.agenda, () =>
                router.push({
                  pathname: "/pro-agenda",
                  params: { semaine: parisDateTime(appointment).date },
                }),
              )
            : null}
          {action(done ? RotateCcw : Check, done ? t.markTodo : t.markDone, () => void toggle())}
        </View>
      </ExampleLock>
    </View>
  );
}

/** Réglages et essai : la carte de la secrétaire, puis ce qu'elle annonce et ce qu'elle peut faire. */
function Settings({
  secretary,
  view,
  onView,
  onSaved,
}: {
  secretary: Included;
  view: View_;
  onView: (view: View_) => void;
  onSaved: () => Promise<void>;
}) {
  const [values, setValues] = useState<SecretarySettings>(secretary.settings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calling, setCalling] = useState(false);
  const examples = useExamplesActive();
  const { gauge } = secretary;
  const total = gauge.includedMinutes + gauge.topUpMinutes;
  const exhausted = gauge.level === "epuise";

  async function save() {
    setSaving(true);
    setError(null);
    const failure = await saveSecretarySettings(values);
    setSaving(false);
    if (failure) return setError(failure);
    toast.success(t.settings.saved);
    await onSaved();
  }

  return (
    <FicheScreen
      keyboard
      onRefresh={onSaved}
      footer={
        <ExampleLock locked={examples} note>
          <FicheButton label={t.settings.save} tall onPress={() => void save()} loading={saving} />
        </ExampleLock>
      }
    >
      <PageHead title={t.title} />
      <Tabs secretary={secretary} view={view} onView={onView} />
      <FicheCard padding={4} gap={3}>
        <View style={styles.identity}>
          <View style={styles.initial}>
            <Text style={styles.initialText}>{secretary.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.callText}>
            <Text style={styles.callName}>{secretary.name}</Text>
            <Text style={[styles.state, exhausted ? styles.danger : styles.success]}>
              {exhausted ? t.paused : t.answering}
            </Text>
          </View>
        </View>
        {total > 0 ? (
          <View style={styles.gauge}>
            <View style={styles.gaugeHead}>
              <Text style={styles.gaugeLabel}>{t.minutesLabel}</Text>
              <Text style={styles.meta}>{t.minutesOf(gauge.remainingMinutes, total)}</Text>
            </View>
            <ProgressBar
              value={gauge.remainingMinutes}
              target={total}
              label={t.minutesLabel}
              color={
                gauge.level === "ok"
                  ? colors.primary
                  : gauge.level === "alerte"
                    ? colors.warning
                    : colors.danger
              }
            />
          </View>
        ) : null}
        {calling ? (
          <SecretaryTestCall
            onClose={() => {
              setCalling(false);
              void onSaved();
            }}
          />
        ) : (
          <>
            <FicheButton
              label={t.test.start}
              icon={Play}
              variant="dark"
              disabled={exhausted || examples}
              onPress={() => setCalling(true)}
            />
            <Text style={styles.soft}>{exhausted ? t.test.noMinutes : t.test.hint}</Text>
          </>
        )}
      </FicheCard>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <ToolField
        label={t.settings.displayName}
        value={values.displayName}
        onChangeText={(displayName) => setValues((v) => ({ ...v, displayName }))}
        maxLength={80}
        hint={t.settings.displayNameHint(secretary.company)}
      />
      <SwitchCard
        label={t.settings.canBook}
        value={values.canBook}
        onChange={(canBook) => setValues((v) => ({ ...v, canBook }))}
      />
      {values.canBook ? (
        <View style={styles.block}>
          <Text style={styles.label}>{t.settings.visit}</Text>
          <Segmented
            label={t.settings.visit}
            options={VISITS.map((value) => ({
              value,
              label: t.settings.visitChoices[value] ?? String(value),
            }))}
            value={values.visitMinutes}
            onChange={(visitMinutes) => setValues((v) => ({ ...v, visitMinutes }))}
          />
        </View>
      ) : null}
      <ToolField
        label={t.settings.instructions}
        value={values.instructions}
        onChangeText={(instructions) => setValues((v) => ({ ...v, instructions }))}
        multiline
        numberOfLines={3}
        maxLength={600}
        hint={t.settings.instructionsHint}
      />
      <Tappable
        role="link"
        aria-label={`${t.settings.hours}. ${secretary.hours ? t.settings.hoursSet : t.settings.hoursMissing}`}
        onPress={() => router.push("/pro-disponibilites")}
        style={styles.hours}
      >
        <View style={[styles.callIcon, styles.iconPrimary]}>
          <CalendarClock size={19} color={colors["primary-strong"]} />
        </View>
        <View style={styles.callText}>
          <Text style={styles.hoursTitle}>{t.settings.hours}</Text>
          <Text style={[styles.meta, !secretary.hours && styles.warning]}>
            {secretary.hours ? t.settings.hoursSet : t.settings.hoursMissing}
          </Text>
        </View>
        <ChevronRight size={20} color={colors["muted-foreground"]} />
      </Tappable>
    </FicheScreen>
  );
}

const styles = StyleSheet.create({
  text: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.label },
  soft: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
  cardTitle: {
    fontFamily: font.display,
    fontSize: 19,
    lineHeight: 24,
    letterSpacing: -0.4,
    color: colors.foreground,
  },
  figures: { flexDirection: "row", gap: spacing(2) },
  figure: {
    flex: 1,
    gap: 2,
    padding: spacing(3),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  figureValue: {
    fontFamily: font.display,
    fontSize: 26,
    letterSpacing: -0.8,
    color: colors.foreground,
  },
  figureLabel: {
    fontFamily: font.regular,
    fontSize: 12.5,
    lineHeight: 16,
    color: colors["muted-foreground"],
  },
  call: {
    gap: spacing(3),
    padding: spacing(3.5),
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  callDone: { opacity: 0.8 },
  callHead: { flexDirection: "row", gap: spacing(3) },
  callIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPrimary: { backgroundColor: colors["primary-soft"] },
  iconSuccess: { backgroundColor: colors["success-soft"] },
  callText: { flex: 1, gap: 3 },
  callWho: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing(2) },
  callName: { fontFamily: font.bold, fontSize: 16, color: colors.foreground },
  callState: { fontFamily: font.semibold, fontSize: 14, color: colors.label },
  reason: { fontFamily: font.regular, fontSize: 14.5, lineHeight: 21, color: colors.label },
  meta: { fontFamily: font.regular, fontSize: 12.5, color: colors["muted-foreground"] },
  success: { color: colors.success },
  danger: { color: colors.danger },
  warning: { color: colors.warning },
  actions: { flexDirection: "row", gap: spacing(2) },
  action: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 42,
    paddingHorizontal: spacing(3.5),
    borderRadius: 21,
  },
  actionPrimary: { flex: 1, backgroundColor: colors.primary },
  actionOutline: {
    borderWidth: 1,
    borderColor: colors["border-strong"],
    backgroundColor: colors.surface,
  },
  actionText: { fontFamily: font.semibold, fontSize: 13.5, color: colors.foreground },
  actionTextPrimary: { color: colors["primary-foreground"] },
  pressed: { opacity: 0.75 },
  identity: { flexDirection: "row", alignItems: "center", gap: spacing(3) },
  initial: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors["primary-soft"],
    alignItems: "center",
    justifyContent: "center",
  },
  initialText: { fontFamily: font.display, fontSize: 18, color: colors["primary-strong"] },
  state: { fontFamily: font.semibold, fontSize: 13 },
  gauge: { gap: spacing(1.5) },
  gaugeHead: { flexDirection: "row", justifyContent: "space-between", gap: spacing(3) },
  gaugeLabel: { fontFamily: font.bold, fontSize: 13, color: colors.foreground },
  block: { gap: spacing(1.5) },
  label: { fontFamily: font.bold, fontSize: 14, color: colors.foreground },
  hours: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    padding: spacing(3.5),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  hoursTitle: { fontFamily: font.bold, fontSize: 15, color: colors.foreground },
});

// Patron et chef d'équipe (ADR 0241), comme sur le site.
export default withTeamPermission("secretary", SecretaryScreen);
