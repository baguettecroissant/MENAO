import {
  canRemindNow,
  daysSince,
  moneyMonthLabel,
  openItemLevel,
  openTotalCents,
  type MoneyOverview,
} from "@menao/core";
import { router, type Href } from "expo-router";
import { AlertTriangle, Clock } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Alert, StyleSheet, Switch, Text, View } from "react-native";
import { ListGroup, ListHeader, ListRow } from "@/components/list-kit";
import { MoneyFigures } from "@/components/pro/money-kit";
import { TabHeader } from "@/components/tab-header";
import { fr } from "@/i18n/fr";
import { formatCents, formatDay, formatDayMonthNumeric } from "@/lib/format";
import { sendPaymentReminder, setAutoReminders } from "@/lib/pro-quotes";
import { Card, Notice, Screen, toast } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.moneyOverview;
const { colors, font, spacing } = theme;

/**
 * « Suivi » de l'onglet Argent (F-87, ADR 0237), agent comptable avancé : le mois en bref (carte des
 * chiffres clés « Nette », lot 2), ce qui reste à encaisser avec son ancienneté, et ce qui cloche.
 * Comme sur le site.
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

  /** Toucher d'une ligne « À encaisser » : relancer le client ou ouvrir le chantier (ADR 0238). */
  function actions(item: MoneyOverview["open"][number]) {
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
  const prev = (cents: number) =>
    previousMonth ? t.previous(previousMonth, formatCents(cents)) : null;
  const inMonth = (label: string) => (month ? t.inMonth(label, month) : label);
  const tiles = [
    {
      label: inMonth(t.collected),
      value: formatCents(overview.current.collectedCents),
      detail: prev(overview.previous.collectedCents),
    },
    {
      label: inMonth(t.signed),
      value: formatCents(overview.current.signedCents),
      detail: t.signedCount(overview.current.signedQuotes),
    },
    {
      label: t.open,
      value: formatCents(openTotalCents(overview.open)),
      detail: t.openCount(overview.open.length),
    },
    {
      label: inMonth(t.expenses),
      value: formatCents(overview.current.expensesCents),
      detail: prev(overview.previous.expensesCents),
    },
  ];

  return (
    <Screen onRefresh={onRefresh}>
      {header}
      <MoneyFigures
        figures={tiles.map((tile) => ({ label: tile.label, value: tile.value, hint: tile.detail }))}
      />
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
                onPress={() => actions(item)}
                title={item.chantier}
                detail={[
                  t.kinds[item.kind],
                  item.failed ? t.failed : null,
                  item.lastReminder
                    ? t.lastReminder(formatDay(item.lastReminder), item.reminders)
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                icon={{
                  icon: Clock,
                  tone:
                    level === "en_retard"
                      ? "danger"
                      : level === "a_relancer"
                        ? "warning"
                        : "primary",
                }}
                value={formatCents(item.amountCents)}
                statusBelow
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

      <Card>
        <Text role="heading" style={styles.heading}>
          {t.autoTitle}
        </Text>
        <Text style={styles.detail}>{t.autoText}</Text>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>{t.autoLabel}</Text>
          <Switch
            value={auto}
            onValueChange={(next) => void toggleAuto(next)}
            disabled={savingAuto}
            accessibilityLabel={t.autoLabel}
            trackColor={{ true: colors.primary, false: colors["border-strong"] }}
          />
        </View>
      </Card>

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
                icon={{ icon: AlertTriangle, tone: "danger" }}
                value={formatCents(item.amountCents)}
                status={{ text: t.checkTitle, tone: "danger" }}
                statusBelow
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
  detail: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
  empty: { fontFamily: font.regular, fontSize: 14, color: colors["muted-foreground"] },
  heading: { fontFamily: font.bold, fontSize: 17, color: colors.foreground },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing(3),
    minHeight: theme.touchTarget,
  },
  switchLabel: { flex: 1, fontFamily: font.medium, fontSize: 15, color: colors.foreground },
});
