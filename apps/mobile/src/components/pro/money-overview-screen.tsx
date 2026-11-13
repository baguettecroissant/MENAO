import {
  MONEY_REMINDER_DAYS,
  canRemindNow,
  daysSince,
  lateOpenCount,
  moneyMonthDeltas,
  moneyMonthLabel,
  nextAutoReminder,
  openItemLevel,
  openTotalCents,
  type MoneyOverview,
} from "@menao/core";
import { router, type Href } from "expo-router";
import { CircleHelp, Send, TrendingDown, TrendingUp } from "lucide-react-native";
import { Fragment, useState, type ReactNode } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { CardHeading, FicheButton, FicheTag, type FicheTone } from "@/components/pro/fiche-kit";
import { ToolSwitch } from "@/components/pro/tools-kit";
import { TabHeader } from "@/components/tab-header";
import { fr } from "@/i18n/fr";
import {
  formatCents,
  formatCentsWhole,
  formatDayMonth,
  formatSignedCentsWhole,
} from "@/lib/format";
import { sendPaymentReminder, setAutoReminders } from "@/lib/pro-quotes";
import { Notice, Screen, toast } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.moneyOverview;
const { colors, font, radius, spacing } = theme;
type OpenItem = MoneyOverview["open"][number];

const LEVEL_TONES: Record<ReturnType<typeof openItemLevel>, FicheTone> = {
  recent: "neutral",
  a_relancer: "warning",
  en_retard: "danger",
};

/**
 * « Suivi » de l'onglet Argent (F-87, ADR 0237), agent comptable avancé, refonte « Nette » (lot 37,
 * maquette « SuiviMobile ») : le mois en bref en 4 tuiles avec l'écart sur le mois précédent, ce
 * qui reste à encaisser avec l'ancienneté, la frise des relances et « Relancer », la carte des
 * relances automatiques, puis ce qui cloche. Calculs dans @menao/core (règle 4).
 */
export function MoneyOverviewScreen({
  overview,
  switcher,
  onRefresh,
}: {
  overview: MoneyOverview | null;
  switcher: ReactNode;
  onRefresh: () => Promise<unknown>;
}) {
  const header = <TabHeader title={fr.tabs.money}>{switcher}</TabHeader>;
  const [auto, setAuto] = useState(overview?.autoReminders ?? false);
  const [savingAuto, setSavingAuto] = useState(false);

  /** « Relancer » : relancer le client ou ouvrir le chantier (ADR 0238), 3 jours entre deux relances. */
  function actions(item: OpenItem) {
    const open = () => router.push(`/pro-chantier/${item.chantierId}` as Href);
    const allowed = canRemindNow(item.lastReminder, new Date());
    Alert.alert(item.chantier, allowed ? t.remindHint : t.remindTooSoon, [
      ...(allowed
        ? [
            {
              text: t.remind,
              onPress: async () => {
                const failed = await sendPaymentReminder(item.chantierId, item.kind);
                if (failed) toast.error(failed);
                else {
                  toast.success(t.reminded);
                  void onRefresh();
                }
              },
            },
          ]
        : []),
      { text: t.openChantier, onPress: open },
      { text: t.cancel, style: "cancel" as const },
    ]);
  }

  async function toggleAuto(next: boolean) {
    if (savingAuto) return;
    setAuto(next);
    setSavingAuto(true);
    const failed = await setAutoReminders(next);
    setSavingAuto(false);
    if (failed) {
      setAuto(!next);
      toast.error(failed);
    } else toast.success(next ? t.autoOn : t.autoOff);
  }
  if (!overview) {
    return (
      <Screen onRefresh={onRefresh}>
        {header}
        <Notice tone="error">{t.error}</Notice>
      </Screen>
    );
  }
  const now = new Date();
  const month = moneyMonthLabel(overview.current.month);
  const previousMonth = moneyMonthLabel(overview.previous.month);
  const deltas = moneyMonthDeltas(overview);
  const openTotal = openTotalCents(overview.open);
  const delta = (cents: number, goodWhenUp: boolean) => (
    <Delta cents={cents} goodWhenUp={goodWhenUp} month={previousMonth} />
  );

  return (
    <Screen onRefresh={onRefresh}>
      {header}
      <Text role="heading" style={styles.monthTitle}>
        {month ? t.monthTitle(month) : t.title}
      </Text>
      <View style={styles.grid}>
        <View style={styles.gridRow}>
          <Tile label={t.collected} value={formatCentsWhole(overview.current.collectedCents)}>
            {delta(deltas.collectedCents, true)}
          </Tile>
          <Tile label={t.signed} value={formatCentsWhole(overview.current.signedCents)} left>
            <View style={styles.hintRow}>
              <Text style={styles.hint}>
                {deltas.signedCents === 0
                  ? t.signedCount(overview.current.signedQuotes)
                  : t.signedHint(overview.current.signedQuotes)}
              </Text>
              {delta(deltas.signedCents, true)}
            </View>
          </Tile>
        </View>
        <View style={[styles.gridRow, styles.gridRowTop]}>
          <Tile label={t.open} value={formatCentsWhole(openTotal)}>
            <Text style={styles.hint}>
              {t.openSummary(overview.open.length, lateOpenCount(overview.open, now))}
            </Text>
          </Tile>
          <Tile label={t.expenses} value={formatCentsWhole(overview.current.expensesCents)} left>
            {delta(deltas.expensesCents, false)}
          </Tile>
        </View>
      </View>

      <View style={styles.list}>
        <View style={styles.listHead}>
          <CardHeading
            title={t.openTitle}
            size={17}
            right={<Text style={styles.listTotal}>{formatCents(openTotal)}</Text>}
          />
        </View>
        {overview.open.length === 0 ? (
          <Text style={[styles.empty, styles.rowBorder]}>{t.openEmpty}</Text>
        ) : (
          overview.open.map((item) => (
            <OpenRow
              key={`${item.chantierId}-${item.kind}`}
              item={item}
              now={now}
              auto={auto}
              onRemind={() => actions(item)}
            />
          ))
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.autoHead}>
          <View style={styles.flex}>
            <CardHeading title={t.autoTitle} size={17} />
          </View>
          <ToolSwitch label={t.autoLabel} value={auto} onChange={(next) => void toggleAuto(next)} />
        </View>
        <Text style={styles.text}>{t.autoText}</Text>
        <View style={styles.autoSteps}>
          {MONEY_REMINDER_DAYS.map((days) => (
            <View key={days} style={styles.autoStep}>
              <View style={styles.autoBadge}>
                <Text style={styles.autoBadgeText}>{t.stepLabel(days)}</Text>
              </View>
              <Text style={styles.autoStepText}>{t.stepText(days)}</Text>
            </View>
          ))}
        </View>
        <View style={styles.note}>
          <CircleHelp size={15} color={colors["muted-foreground"]} style={styles.noteIcon} />
          <Text style={[styles.text, styles.flex]}>{t.manualNote}</Text>
        </View>
      </View>

      {overview.withoutInvoice.length > 0 ? (
        <View style={styles.card}>
          <CardHeading title={t.checkTitle} size={17} />
          {overview.withoutInvoice.map((item) => (
            <Pressable
              key={`${item.chantierId}-${item.kind}-${item.paidAt}`}
              role="link"
              onPress={() => router.push(`/pro-chantier/${item.chantierId}` as Href)}
              style={({ pressed }) => [styles.checkRow, pressed && styles.pressed]}
            >
              <View style={styles.flex}>
                <Text style={styles.strong}>{item.chantier}</Text>
                <Text style={styles.meta}>
                  {[
                    t.withoutInvoice(t.kinds[item.kind] ?? ""),
                    item.paidAt ? formatDayMonth(item.paidAt) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </View>
              <Text style={styles.strong}>{formatCents(item.amountCents)}</Text>
            </Pressable>
          ))}
          <Text style={styles.meta}>{t.withoutInvoiceHint}</Text>
        </View>
      ) : null}
      <Text style={styles.ttc}>{t.ttc}</Text>
    </Screen>
  );
}

/** Tuile du mois en bref : intitulé, chiffre en grand (Inter Tight), précision dessous. */
function Tile({
  label,
  value,
  left = false,
  children,
}: {
  label: string;
  value: string;
  /** Tuile de droite : trait de séparation à gauche. */
  left?: boolean;
  children?: ReactNode;
}) {
  return (
    <View style={[styles.tile, left && styles.tileLeft]}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {children}
    </View>
  );
}

/**
 * Écart sur le mois précédent, flèche comprise : vert si c'est bon (encaissé ou devis en hausse,
 * dépenses en baisse), rouge sinon. Rien quand il n'y a pas d'écart.
 */
function Delta({
  cents,
  goodWhenUp,
  month,
}: {
  cents: number;
  goodWhenUp: boolean;
  month: string;
}) {
  if (cents === 0) return null;
  const up = cents > 0;
  const color = up === goodWhenUp ? colors.success : colors.danger;
  const Icon = up ? TrendingUp : TrendingDown;
  const text = formatSignedCentsWhole(cents);
  return (
    <View accessible aria-label={t.deltaLabel(text, month)} style={styles.delta}>
      <Icon size={15} color={color} strokeWidth={2.4} />
      <Text style={[styles.deltaText, { color }]}>{text}</Text>
    </View>
  );
}

/** Paiement à encaisser : chantier, montant, pastilles, frise des relances, « Relancer », info. */
function OpenRow({
  item,
  now,
  auto,
  onRemind,
}: {
  item: OpenItem;
  now: Date;
  auto: boolean;
  onRemind: () => void;
}) {
  const days = daysSince(item.since, now);
  const next = auto && !item.lastReminder ? nextAutoReminder(item.since, now) : null;
  const info = item.lastReminder
    ? t.lastReminder(formatDayMonth(item.lastReminder), item.reminders)
    : next
      ? t.nextAuto(formatDayMonth(next))
      : null;
  return (
    <View style={[styles.row, styles.rowBorder]}>
      <Pressable
        role="link"
        aria-label={`${item.chantier}, ${t.kinds[item.kind]}, ${formatCents(item.amountCents)}`}
        onPress={() => router.push(`/pro-chantier/${item.chantierId}` as Href)}
        style={({ pressed }) => [styles.rowHead, pressed && styles.pressed]}
      >
        <View style={styles.rowTitles}>
          <Text style={styles.strong}>{item.chantier}</Text>
          <Text style={styles.meta}>{t.kinds[item.kind]}</Text>
        </View>
        <Text style={styles.strong}>{formatCents(item.amountCents)}</Text>
      </Pressable>
      {days !== null || item.failed ? (
        <View style={styles.tags}>
          {days !== null ? (
            <FicheTag text={t.dueSince(days)} tone={LEVEL_TONES[openItemLevel(days)]} dot />
          ) : null}
          {item.failed ? <FicheTag text={t.failed} tone="danger" /> : null}
        </View>
      ) : null}
      <View style={styles.remindRow}>
        <ReminderTrack sent={Math.min(item.reminders, MONEY_REMINDER_DAYS.length)} />
        <FicheButton label={t.remindShort} icon={Send} variant="secondary" onPress={onRemind} />
      </View>
      {info ? <Text style={styles.info}>{info}</Text> : null}
    </View>
  );
}

/** Frise J+7 — J+15 — J+30 : relances faites en points pleins, à venir en points creux. */
function ReminderTrack({ sent }: { sent: number }) {
  return (
    <View accessible aria-label={t.remindersLabel(sent)} style={styles.track}>
      {MONEY_REMINDER_DAYS.map((days, i) => {
        const on = i < sent;
        return (
          <Fragment key={days}>
            {i > 0 ? <View style={[styles.trackLine, i < sent && styles.trackLineOn]} /> : null}
            <View style={styles.trackStep}>
              <View style={[styles.trackDot, on ? styles.trackDotOn : styles.trackDotOff]} />
              <Text style={[styles.trackText, !on && styles.trackTextOff]}>
                {t.stepLabel(days)}
              </Text>
            </View>
          </Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  monthTitle: {
    fontFamily: font.display,
    fontSize: 18,
    lineHeight: 23,
    letterSpacing: -0.36,
    color: colors.foreground,
  },
  grid: {
    overflow: "hidden",
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  gridRow: { flexDirection: "row" },
  gridRowTop: { borderTopWidth: 1, borderTopColor: colors.border },
  tile: { flex: 1, minWidth: 0, gap: 5, padding: 14 },
  tileLeft: { borderLeftWidth: 1, borderLeftColor: colors.border },
  tileLabel: { fontFamily: font.semibold, fontSize: 13, color: colors.label },
  tileValue: {
    fontFamily: font.display,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.72,
    fontVariant: ["tabular-nums"],
    color: colors.foreground,
  },
  hintRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center" },
  hint: {
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors["muted-foreground"],
  },
  delta: { flexDirection: "row", alignItems: "center", gap: 5 },
  deltaText: { fontFamily: font.semibold, fontSize: 13, lineHeight: 16 },
  list: {
    overflow: "hidden",
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  listHead: { paddingTop: 14, paddingBottom: 10, paddingHorizontal: spacing(4) },
  listTotal: { fontFamily: font.bold, fontSize: 14, color: colors.foreground },
  empty: {
    paddingVertical: 14,
    paddingHorizontal: spacing(4),
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors["muted-foreground"],
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  row: { gap: spacing(2), paddingVertical: 14, paddingHorizontal: spacing(4) },
  rowHead: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  rowTitles: { flex: 1, minWidth: 0, gap: 2 },
  strong: { fontFamily: font.bold, fontSize: 15, lineHeight: 20, color: colors.foreground },
  meta: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  remindRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  info: {
    fontFamily: font.regular,
    fontSize: 12.5,
    lineHeight: 17,
    color: colors["muted-foreground"],
  },
  track: { flexShrink: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  trackStep: { flexDirection: "row", alignItems: "center", gap: 5 },
  trackDot: { width: 10, height: 10, borderRadius: 5 },
  trackDotOn: { backgroundColor: colors.foreground },
  trackDotOff: {
    borderWidth: 2,
    borderColor: colors["border-strong"],
    backgroundColor: colors.surface,
  },
  trackText: { fontFamily: font.semibold, fontSize: 12, color: colors.foreground },
  trackTextOff: { color: colors["muted-foreground"] },
  trackLine: { width: 14, height: 2, backgroundColor: colors.border },
  trackLineOn: { backgroundColor: colors.foreground },
  card: {
    gap: spacing(3),
    padding: 18,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  text: {
    fontFamily: font.regular,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors["muted-foreground"],
  },
  autoSteps: { gap: 10 },
  autoStep: { flexDirection: "row", alignItems: "flex-start", gap: spacing(3) },
  autoBadge: {
    width: 44,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  autoBadgeText: { fontFamily: font.bold, fontSize: 12, color: colors.foreground },
  autoStepText: {
    flex: 1,
    paddingTop: 3,
    fontFamily: font.regular,
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.label,
  },
  autoHead: { flexDirection: "row", alignItems: "center", gap: spacing(3) },
  note: { flexDirection: "row", alignItems: "flex-start", gap: spacing(2) },
  noteIcon: { marginTop: 2, flexShrink: 0 },
  checkRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing(3) },
  ttc: {
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors["muted-foreground"],
  },
});
