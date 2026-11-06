import {
  daysSince,
  moneyMonthLabel,
  openItemLevel,
  openTotalCents,
  type MoneyOverview,
} from "@menao/core";
import { router, type Href } from "expo-router";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ListGroup, ListHeader, ListRow } from "@/components/list-kit";
import { TabHeader } from "@/components/tab-header";
import { fr } from "@/i18n/fr";
import { formatCents, formatDayMonthNumeric } from "@/lib/format";
import { Card, Notice, Screen } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.moneyOverview;
const { colors, font, spacing } = theme;

/**
 * « Suivi » de l'onglet Argent (F-87, ADR 0237), agent comptable avancé : le mois en bref, ce qui
 * reste à encaisser avec son ancienneté, et ce qui cloche. Comme sur le site.
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
  const prev = (cents: number) =>
    previousMonth ? t.previous(previousMonth, formatCents(cents)) : null;
  const tiles = [
    {
      label: t.collected,
      value: formatCents(overview.current.collectedCents),
      detail: prev(overview.previous.collectedCents),
    },
    {
      label: t.signed,
      value: formatCents(overview.current.signedCents),
      detail: t.signedCount(overview.current.signedQuotes),
    },
    {
      label: t.open,
      value: formatCents(openTotalCents(overview.open)),
      detail: t.openCount(overview.open.length),
    },
    {
      label: t.expenses,
      value: formatCents(overview.current.expensesCents),
      detail: prev(overview.previous.expensesCents),
    },
  ];

  return (
    <Screen onRefresh={onRefresh}>
      {header}
      <ListHeader title={month ? t.monthTitle(month) : t.title} />
      <View style={styles.grid}>
        {tiles.map((tile) => (
          <View key={tile.label} style={styles.tile}>
            <Card>
              <Text style={styles.label}>{tile.label}</Text>
              <Text style={styles.value}>{tile.value}</Text>
              {tile.detail ? <Text style={styles.detail}>{tile.detail}</Text> : null}
            </Card>
          </View>
        ))}
      </View>
      <Text style={styles.detail}>{t.ttc}</Text>

      <ListHeader title={t.openTitle} />
      {overview.open.length === 0 ? (
        <Text style={styles.empty}>{t.openEmpty}</Text>
      ) : (
        <ListGroup>
          {overview.open.map((item) => {
            const days = daysSince(item.since, now);
            const level = openItemLevel(days);
            return (
              <ListRow
                key={`${item.chantierId}-${item.kind}`}
                onPress={() => router.push(`/pro-chantier/${item.chantierId}` as Href)}
                title={item.chantier}
                detail={[t.kinds[item.kind], item.failed ? t.failed : null]
                  .filter(Boolean)
                  .join(" · ")}
                value={formatCents(item.amountCents)}
                status={
                  days === null
                    ? undefined
                    : {
                        text: t.dueSince(days),
                        tone:
                          level === "en_retard"
                            ? "danger"
                            : level === "a_relancer"
                              ? "warning"
                              : "neutral",
                      }
                }
              />
            );
          })}
        </ListGroup>
      )}

      {overview.withoutInvoice.length > 0 ? (
        <>
          <ListHeader title={t.checkTitle} />
          <ListGroup>
            {overview.withoutInvoice.map((item) => (
              <ListRow
                key={`${item.chantierId}-${item.kind}-${item.paidAt}`}
                onPress={() => router.push(`/pro-chantier/${item.chantierId}` as Href)}
                title={item.chantier}
                detail={[
                  t.withoutInvoice(t.kinds[item.kind] ?? ""),
                  item.paidAt ? formatDayMonthNumeric(item.paidAt.slice(0, 10)) : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                value={formatCents(item.amountCents)}
                status={{ text: t.checkTitle, tone: "danger" }}
              />
            ))}
          </ListGroup>
          <Text style={styles.detail}>{t.withoutInvoiceHint}</Text>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -spacing(1.5) },
  tile: { width: "50%", padding: spacing(1.5) },
  label: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  value: {
    fontFamily: font.medium,
    fontSize: 19,
    color: colors.foreground,
    fontVariant: ["tabular-nums"],
  },
  detail: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
  empty: { fontFamily: font.regular, fontSize: 14, color: colors["muted-foreground"] },
});
