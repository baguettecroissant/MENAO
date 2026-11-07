import { revenueTicks, type DashboardActivity } from "@menao/core";
import { router, type Href } from "expo-router";
import {
  CalendarClock,
  CalendarX2,
  ChevronLeft,
  ChevronRight,
  FilePen,
  ReceiptText,
  Share2,
  UserPlus,
  type LucideIcon,
} from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { formatCents, formatDay } from "@/lib/format";
import { Tappable } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proDashboard.activity;
const { colors, font, radius, spacing } = theme;
const roundEuros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
/** Montant arrondi à l'euro des tuiles (le détail au centime est dans les listes). */
const euroRound = (cents: number) => roundEuros.format(Math.round(cents / 100));
const compact = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
});
const monthLong = new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "UTC" });
const monthName = (index: number) => monthLong.format(new Date(Date.UTC(2026, index, 15)));
const CHART_HEIGHT = 160;

const cardShadow = "0 1px 3px rgba(17, 23, 40, 0.06)";

/**
 * Raccourcis du tableau de bord (ADR 0185), comme sur le site, avec les factures et les
 * disponibilités. Aucun lien vers l'abonnement (règle 10).
 */
export function ActivityShortcuts({
  quoteHref,
  example = false,
  patron = true,
}: {
  quoteHref: Href;
  /** Exemples (ADR 0184) : pas de raccourci vers les vrais réglages (disponibilités). */
  example?: boolean;
  /** Partager la fiche, inviter un artisan : le patron seulement (ADR 0241). */
  patron?: boolean;
}) {
  const items: { icon: LucideIcon; label: string; href: Href }[] = [
    { icon: FilePen, label: t.shortcuts.quote, href: quoteHref },
    { icon: CalendarX2, label: t.shortcuts.block, href: "/pro-agenda" },
    ...(patron
      ? [
          { icon: Share2, label: t.shortcuts.share, href: "/pro-ma-fiche" as Href },
          { icon: UserPlus, label: t.shortcuts.invite, href: "/compte" as Href },
        ]
      : []),
    {
      icon: ReceiptText,
      label: fr.proInvoices.open,
      href: { pathname: "/pro/argent", params: { vue: "factures" } },
    },
    ...(example
      ? []
      : [
          {
            icon: CalendarClock,
            label: fr.proAvailability.title,
            href: "/pro-disponibilites" as Href,
          },
        ]),
  ];
  return (
    <View style={styles.tiles}>
      {items.map(({ icon: Icon, label, href }) => (
        <Tappable
          key={label}
          role="link"
          aria-label={label}
          onPress={() => router.push(href)}
          style={styles.tile}
        >
          <View style={styles.tileIcon}>
            <Icon size={18} color={colors["primary-strong"]} />
          </View>
          <Text style={styles.tileLabel} numberOfLines={2}>
            {label}
          </Text>
        </Tappable>
      ))}
    </View>
  );
}

/** Petit chiffre d'une carte : intitulé, valeur en Inter Tight, précision facultative. */
export type ActivityStat = { label: string; value: string; hint?: string };

function Stat({ label, value, hint }: ActivityStat) {
  return (
    <View style={styles.stat} accessible aria-label={`${label} : ${value}`}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
    </View>
  );
}

function Section({
  title,
  summary,
  children,
}: {
  title: string;
  summary?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text role="heading" style={styles.cardTitle}>
          {title}
        </Text>
        {summary ? <Text style={styles.summary}>{summary}</Text> : null}
      </View>
      {children}
    </View>
  );
}

/** Ligne de liste : ouvre le chantier. */
function Row({ href, children }: { href: Href; children: ReactNode }) {
  return (
    <Tappable role="link" onPress={() => router.push(href)} style={styles.row}>
      <View style={styles.rowBody}>{children}</View>
      <ChevronRight size={18} color={colors["muted-foreground"]} />
    </Tappable>
  );
}

/**
 * Bandeau de l'argent (refonte « Nette », ADR 0245), comme sur le site : encaissé ce mois en grand
 * avec son évolution, puis à venir (reste à payer sur les devis signés) et à recevoir (soldes des
 * chantiers réceptionnés) côte à côte.
 */
export function MoneyCard({
  monthCents,
  trend,
  activity,
}: {
  monthCents: number;
  trend: ReactNode;
  activity: DashboardActivity;
}) {
  const cells = [
    {
      label: t.revenue.upcoming,
      value: euroRound(activity.upcomingCents),
      hint: t.revenue.upcomingHint,
    },
    {
      label: t.revenue.toCollect,
      value: euroRound(activity.toCollectCents),
      hint: t.revenue.toCollectHint,
    },
  ];
  return (
    <View style={styles.money} aria-label={fr.proDashboard.money}>
      <View
        style={styles.moneyTop}
        accessible
        aria-label={`${fr.proDashboard.revenue} : ${formatCents(monthCents)}`}
      >
        <Text style={styles.moneyLabel}>{fr.proDashboard.revenue}</Text>
        <Text style={styles.moneyValue}>{formatCents(monthCents)}</Text>
      </View>
      {trend ? <View style={styles.moneyTrend}>{trend}</View> : null}
      <View style={styles.moneyCells}>
        {cells.map((cell, i) => (
          <View
            key={cell.label}
            style={[styles.moneyCell, i === 0 && styles.moneyCellBorder]}
            accessible
            aria-label={`${cell.label} : ${cell.value}, ${cell.hint}`}
          >
            <Text style={styles.moneyCellLabel}>{cell.label}</Text>
            <Text style={styles.moneyCellValue}>{cell.value}</Text>
            <Text style={styles.moneyCellHint}>{cell.hint}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Chiffre d'affaires de l'année (ADR 0185), comme sur le site : encaissé, à venir, à recevoir,
 * puis les colonnes mois par mois. Toucher une colonne affiche son montant ; le mois le plus haut
 * est écrit au-dessus de sa colonne.
 */
export function RevenueCard({
  activity,
  years,
  onYear,
  currentMonth,
}: {
  activity: DashboardActivity;
  years: number[];
  onYear: (year: number) => void;
  currentMonth: number | null;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const ticks = revenueTicks(activity.months);
  const top = ticks.at(-1) ?? 0;
  const max = Math.max(...activity.months);
  const peak = activity.months.indexOf(max);
  const height = (cents: number) => (top > 0 ? (cents / top) * CHART_HEIGHT : 0);
  const index = years.indexOf(activity.year);
  const older = years[index + 1];
  const newer = index > 0 ? years[index - 1] : undefined;
  const shown = selected ?? peak;
  return (
    <View style={styles.card}>
      <View style={styles.yearHead}>
        <View style={styles.cardHead}>
          <Text role="heading" style={styles.cardTitle}>
            {t.revenue.title}
          </Text>
          <Text style={styles.summary}>
            {t.revenue.collected(activity.year, euroRound(activity.yearCents))}
          </Text>
        </View>
        <View style={styles.yearSwitch}>
          <Tappable
            role="button"
            aria-label={t.revenue.previousYear}
            disabled={older === undefined}
            onPress={() => older !== undefined && onYear(older)}
            style={[styles.yearButton, older === undefined && styles.disabled]}
          >
            <ChevronLeft size={16} color={colors.foreground} />
          </Tappable>
          <Text style={styles.yearText}>{activity.year}</Text>
          <Tappable
            role="button"
            aria-label={t.revenue.nextYear}
            disabled={newer === undefined}
            onPress={() => newer !== undefined && onYear(newer)}
            style={[styles.yearButton, newer === undefined && styles.disabled]}
          >
            <ChevronRight size={16} color={colors.foreground} />
          </Tappable>
        </View>
      </View>
      {activity.yearCents === 0 ? (
        <Text style={styles.empty}>{t.revenue.empty(activity.year)}</Text>
      ) : (
        <View style={styles.chartBox}>
          <Text style={styles.selected}>
            {t.revenue.bar(monthName(shown), formatCents(activity.months[shown] ?? 0))}
          </Text>
          <View style={styles.chart}>
            {ticks.map((tick) => (
              <View key={tick} style={[styles.grid, { bottom: height(tick) }]}>
                <Text style={styles.tick}>{tick === 0 ? "0" : compact.format(tick / 100)}</Text>
              </View>
            ))}
            <View style={styles.columns}>
              {activity.months.map((cents, i) => {
                const future = currentMonth !== null && i > currentMonth;
                return (
                  <Tappable
                    key={i}
                    role="button"
                    aria-label={t.revenue.bar(monthName(i), formatCents(cents))}
                    aria-selected={i === shown}
                    onPress={() => setSelected(i)}
                    scaleTo={1}
                    style={styles.column}
                  >
                    {!future && cents > 0 ? (
                      <View
                        style={[
                          styles.bar,
                          { height: Math.max(2, height(cents)) },
                          i === shown && styles.barSelected,
                        ]}
                      />
                    ) : null}
                  </Tappable>
                );
              })}
            </View>
          </View>
          <View style={styles.monthRow}>
            {activity.months.map((_, i) => (
              <Text
                key={i}
                style={[styles.month, i === currentMonth && styles.monthCurrent]}
                aria-hidden
              >
                {monthName(i).charAt(0).toUpperCase()}
              </Text>
            ))}
          </View>
        </View>
      )}
      <Text style={styles.note}>{t.revenue.note}</Text>
    </View>
  );
}

/** Devis en attente de réponse, taux de signature et devis signé moyen (ADR 0185). */
export function QuotesCard({
  activity,
  extraStats = [],
}: {
  activity: DashboardActivity;
  /** Chiffres ajoutés à la grille (clients en attente, temps de réponse, ADR 0245). */
  extraStats?: ActivityStat[];
}) {
  const { pending, pendingTotalCents, signRate, averageSignedCents } = activity.quotes;
  return (
    <Section
      title={t.quotes.title}
      summary={
        pending.length
          ? t.quotes.summary(pending.length, formatCents(pendingTotalCents))
          : undefined
      }
    >
      {pending.length === 0 ? (
        <Text style={styles.muted}>{t.quotes.empty}</Text>
      ) : (
        <View>
          {pending.slice(0, 3).map((q) => (
            <Row key={q.quoteId} href={`/pro-chantier/${q.chantierId}`}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {q.title}
                </Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {[q.clientName, q.sentAt ? t.quotes.sentOn(formatDay(q.sentAt)) : null]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </View>
              <Text style={styles.amount}>{formatCents(q.totalTtcCents)}</Text>
            </Row>
          ))}
        </View>
      )}
      <View style={styles.stats}>
        <Stat label={t.quotes.signRate} value={signRate === null ? "—" : `${signRate} %`} />
        <Stat
          label={t.quotes.average}
          value={averageSignedCents === null ? "—" : euroRound(averageSignedCents)}
        />
        {extraStats.map((stat) => (
          <Stat key={stat.label} {...stat} />
        ))}
      </View>
      <Tappable
        role="link"
        onPress={() => router.push({ pathname: "/pro/argent", params: { vue: "devis" } })}
        style={styles.linkButton}
      >
        <Text style={styles.link}>{t.quotes.all}</Text>
      </Tappable>
    </Section>
  );
}

/** Chantiers en cours : étape et part déjà payée (ADR 0185). */
export function InProgressCard({ activity }: { activity: DashboardActivity }) {
  return (
    <Section title={t.inProgress.title}>
      {activity.inProgress.length === 0 ? (
        <Text style={styles.muted}>{t.inProgress.empty}</Text>
      ) : (
        <View>
          {activity.inProgress.map((c) => {
            const share = c.totalCents > 0 ? Math.min(1, c.paidCents / c.totalCents) : 0;
            const paid = t.inProgress.paid(formatCents(c.paidCents), formatCents(c.totalCents));
            return (
              <Row key={c.chantierId} href={`/pro-chantier/${c.chantierId}`}>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {c.title}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {[c.clientName, fr.proChantiers.status[c.status]].filter(Boolean).join(" · ")}
                  </Text>
                  <View
                    style={styles.meter}
                    role="meter"
                    aria-valuemin={0}
                    aria-valuemax={c.totalCents}
                    aria-valuenow={c.paidCents}
                    aria-label={paid}
                  >
                    <View style={[styles.meterFill, { width: `${Math.round(share * 100)}%` }]} />
                  </View>
                  <Text style={styles.rowMeta}>{paid}</Text>
                </View>
              </Row>
            );
          })}
        </View>
      )}
    </Section>
  );
}

/** Soldes à recevoir après la réception des travaux (ADR 0185). */
export function ReceivablesCard({ activity }: { activity: DashboardActivity }) {
  return (
    <Section title={t.receivables.title} summary={t.receivables.hint}>
      {activity.receivables.length === 0 ? (
        <Text style={styles.muted}>{t.receivables.empty}</Text>
      ) : (
        <View>
          {activity.receivables.map((r) => (
            <Row key={r.chantierId} href={`/pro-chantier/${r.chantierId}`}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {r.title}
                </Text>
                {r.clientName ? (
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {r.clientName}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.amount}>{formatCents(r.amountCents)}</Text>
            </Row>
          ))}
        </View>
      )}
    </Section>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: spacing(3) },
  tile: {
    flexGrow: 1,
    flexBasis: "30%",
    minHeight: 88,
    gap: spacing(2),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing(3),
    boxShadow: cardShadow,
  },
  tileIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors["primary-soft"],
    alignItems: "center",
    justifyContent: "center",
  },
  tileLabel: { fontFamily: font.semibold, fontSize: 13, lineHeight: 17, color: colors.foreground },
  card: {
    gap: spacing(4),
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing(5),
    boxShadow: cardShadow,
  },
  cardHead: { flexShrink: 1, gap: spacing(0.5) },
  cardTitle: {
    fontFamily: font.display,
    fontSize: 19,
    letterSpacing: -0.4,
    color: colors.foreground,
  },
  summary: { fontFamily: font.regular, fontSize: 14, color: colors["muted-foreground"] },
  // Bandeau de l'argent (ADR 0245).
  money: {
    overflow: "hidden",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    boxShadow: cardShadow,
  },
  moneyTop: { gap: spacing(2), paddingHorizontal: spacing(5), paddingTop: spacing(5) },
  moneyLabel: { fontFamily: font.semibold, fontSize: 14, color: colors.label },
  moneyValue: {
    fontFamily: font.display,
    fontSize: 38,
    lineHeight: 42,
    letterSpacing: -1.1,
    color: colors.foreground,
    fontVariant: ["tabular-nums"],
  },
  moneyTrend: { paddingHorizontal: spacing(5), paddingTop: spacing(2), paddingBottom: spacing(5) },
  moneyCells: { flexDirection: "row", borderTopWidth: 1, borderTopColor: colors.border },
  moneyCell: { flex: 1, gap: 2, paddingHorizontal: spacing(5), paddingVertical: spacing(4) },
  moneyCellBorder: { borderRightWidth: 1, borderRightColor: colors.border },
  moneyCellLabel: { fontFamily: font.semibold, fontSize: 13, color: colors.label },
  moneyCellValue: {
    fontFamily: font.display,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.5,
    color: colors.foreground,
    fontVariant: ["tabular-nums"],
  },
  moneyCellHint: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 17,
    color: colors["muted-foreground"],
  },
  yearHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing(3),
  },
  yearSwitch: { flexDirection: "row", alignItems: "center", gap: spacing(1) },
  yearButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  disabled: { opacity: 0.35 },
  yearText: {
    fontFamily: font.medium,
    fontSize: 15,
    color: colors.foreground,
    minWidth: 40,
    textAlign: "center",
  },
  stats: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: spacing(3.5),
    columnGap: spacing(4),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing(3.5),
  },
  stat: { flexGrow: 1, flexBasis: "40%", gap: 2 },
  statLabel: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  statValue: {
    fontFamily: font.display,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: colors.foreground,
    fontVariant: ["tabular-nums"],
  },
  statHint: {
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors["muted-foreground"],
  },
  empty: {
    borderRadius: radius.input,
    backgroundColor: colors.background,
    paddingVertical: spacing(6),
    textAlign: "center",
    fontFamily: font.regular,
    fontSize: 14,
    color: colors["muted-foreground"],
  },
  chartBox: { gap: spacing(2) },
  selected: { fontFamily: font.semibold, fontSize: 14, color: colors.foreground },
  chart: { height: CHART_HEIGHT, marginLeft: 44 },
  grid: {
    position: "absolute",
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tick: {
    position: "absolute",
    left: -44,
    top: -8,
    width: 40,
    textAlign: "right",
    fontFamily: font.regular,
    fontSize: 10,
    color: colors["muted-foreground"],
  },
  columns: { flex: 1, flexDirection: "row", alignItems: "flex-end" },
  column: { flex: 1, height: "100%", alignItems: "center", justifyContent: "flex-end" },
  bar: {
    width: "60%",
    maxWidth: 20,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    // Colonnes non choisies : bleu MENAO estompé, plus lisible que le bleu très clair d'avant.
    backgroundColor: `${colors.primary}5c`,
  },
  barSelected: { backgroundColor: colors.primary },
  monthRow: { flexDirection: "row", marginLeft: 44 },
  month: {
    flex: 1,
    textAlign: "center",
    fontFamily: font.regular,
    fontSize: 11,
    color: colors["muted-foreground"],
  },
  monthCurrent: { fontFamily: font.medium, color: colors.foreground },
  note: {
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors["muted-foreground"],
  },
  muted: { fontFamily: font.regular, fontSize: 14, color: colors["muted-foreground"] },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
    paddingVertical: spacing(2.5),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowBody: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing(3) },
  rowText: { flex: 1, gap: spacing(1) },
  rowTitle: { fontFamily: font.semibold, fontSize: 16, color: colors.foreground },
  rowMeta: { fontFamily: font.regular, fontSize: 14, color: colors["muted-foreground"] },
  amount: {
    fontFamily: font.display,
    fontSize: 17,
    color: colors.foreground,
    fontVariant: ["tabular-nums"],
  },
  meter: {
    height: 8,
    overflow: "hidden",
    borderRadius: radius.pill,
    backgroundColor: colors.background,
  },
  meterFill: { height: "100%", borderRadius: radius.pill, backgroundColor: colors.primary },
  linkButton: { alignSelf: "flex-start", paddingVertical: spacing(1) },
  link: { fontFamily: font.semibold, fontSize: 14, color: colors["primary-strong"] },
});
