import type { ConnectOverview, Payout } from "@menao/core";
import { StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { formatLongDate } from "@/lib/dates";
import type { Money } from "@/lib/payments";
import { Card, Notice } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proPayments.overview;
const { colors, font, spacing } = theme;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const money = (cents: number) => euros.format(cents / 100);

function scheduleText(schedule: ConnectOverview["schedule"]): string | null {
  if (!schedule) return null;
  switch (schedule.interval) {
    case "daily":
      return t.schedule.daily;
    case "weekly":
      return t.schedule.weekly(t.weekdays[schedule.weeklyAnchor ?? ""] ?? "lundi");
    case "monthly":
      return t.schedule.monthly(schedule.monthlyAnchor ?? 1);
    case "manual":
      return t.schedule.manual;
  }
}

/**
 * « Votre argent » (ADR 0152), comme sur le site : solde, prochain virement, encaissé via MENAO,
 * frais du mois et derniers virements, lus chez Stripe. Lecture seule.
 */
export function MoneyPanel({ data }: { data: Money }) {
  const { overview, collected } = data;
  return (
    <Card>
      <View style={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          {t.title}
        </Text>
        {overview === null ? (
          <Notice tone="info">{t.unavailable}</Notice>
        ) : (
          <>
            <View style={styles.grid}>
              <Figure
                label={t.available}
                value={money(overview.availableCents)}
                hint={t.availableHint}
                strong
              />
              <Figure label={t.pending} value={money(overview.pendingCents)} hint={t.pendingHint} />
              <Figure
                label={t.nextPayout}
                value={overview.nextPayout ? money(overview.nextPayout.amountCents) : "—"}
                hint={
                  overview.nextPayout
                    ? t.nextPayoutOn(formatLongDate(overview.nextPayout.arrivalDate))
                    : t.noPayout
                }
              />
              <Figure
                label={t.collectedMonth}
                value={money(collected.monthCents)}
                hint={t.collectedYear(money(collected.yearCents))}
              />
            </View>
            <View style={styles.facts}>
              {overview.bank ? (
                <Text style={styles.fact}>{t.bank(overview.bank.name, overview.bank.last4)}</Text>
              ) : null}
              {scheduleText(overview.schedule) ? (
                <Text style={styles.fact}>{scheduleText(overview.schedule)}</Text>
              ) : null}
              {overview.schedule?.delayDays ? (
                <Text style={styles.fact}>{t.delay(overview.schedule.delayDays)}</Text>
              ) : null}
              <Text style={styles.fact}>{`${t.fees} : ${money(overview.feesThisMonthCents)}`}</Text>
            </View>
            {overview.recentPayouts.length > 0 ? (
              <View style={styles.recent}>
                <Text accessibilityRole="header" style={styles.recentTitle}>
                  {t.recent}
                </Text>
                {overview.recentPayouts.map((payout, i) => (
                  <PayoutRow key={`${payout.arrivalDate}-${i}`} payout={payout} />
                ))}
              </View>
            ) : null}
            <Text style={styles.readOnly}>{t.readOnly}</Text>
          </>
        )}
      </View>
    </Card>
  );
}

function Figure({
  label,
  value,
  hint,
  strong = false,
}: {
  label: string;
  value: string;
  hint: string;
  strong?: boolean;
}) {
  return (
    <View
      style={[styles.figure, strong && styles.figureStrong]}
      accessible
      accessibilityLabel={`${label} : ${value}. ${hint}`}
    >
      <Text style={styles.figureLabel}>{label}</Text>
      <Text style={styles.figureValue}>{value}</Text>
      <Text style={styles.figureHint}>{hint}</Text>
    </View>
  );
}

function PayoutRow({ payout }: { payout: Payout }) {
  const tone =
    payout.status === "paid"
      ? colors.success
      : payout.status === "failed" || payout.status === "canceled"
        ? colors.danger
        : colors["primary-strong"];
  return (
    <View style={styles.row}>
      <Text style={styles.rowDate}>{formatLongDate(payout.arrivalDate)}</Text>
      <Text style={[styles.rowStatus, { color: tone }]}>{t.status[payout.status]}</Text>
      <Text style={styles.rowAmount}>{money(payout.amountCents)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing(3) },
  title: { fontFamily: font.bold, fontSize: 17, color: colors.foreground },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  figure: {
    flexGrow: 1,
    flexBasis: "45%",
    gap: spacing(0.5),
    padding: spacing(3),
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  figureStrong: { borderColor: colors["primary-soft"], backgroundColor: colors["primary-softer"] },
  figureLabel: { fontFamily: font.medium, fontSize: 13, color: colors["muted-foreground"] },
  figureValue: {
    fontFamily: font.bold,
    fontSize: 20,
    color: colors.foreground,
    fontVariant: ["tabular-nums"],
  },
  figureHint: {
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors["muted-foreground"],
  },
  facts: { gap: spacing(1) },
  fact: {
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors["muted-foreground"],
  },
  recent: { gap: spacing(1) },
  recentTitle: { fontFamily: font.bold, fontSize: 15, color: colors.foreground },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
    paddingVertical: spacing(2),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowDate: { flex: 1, fontFamily: font.regular, fontSize: 14, color: colors.foreground },
  rowStatus: { fontFamily: font.medium, fontSize: 12 },
  rowAmount: {
    fontFamily: font.bold,
    fontSize: 14,
    color: colors.foreground,
    fontVariant: ["tabular-nums"],
  },
  readOnly: {
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors["subtle-foreground"],
  },
});
