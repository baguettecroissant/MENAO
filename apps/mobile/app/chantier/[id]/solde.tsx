import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Check, CircleDashed, Lock, MapPin } from "lucide-react-native";
import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { HeaderBand } from "@/components/header-band";
import { StepTabs } from "@/components/step-tabs";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { formatCents } from "@/lib/format";
import { openHostedPage } from "@/lib/hosted";
import { loadBalance, startBalancePayment } from "@/lib/reception";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Button, Card, Notice, Screen } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.balance;
const { colors, font, spacing } = theme;
const STEPS = [
  { key: "pv", label: fr.reception.steps.pv },
  { key: "solde", label: fr.reception.steps.solde },
] as const;

/**
 * Paiement du solde (F-32), comme sur le site : montant déjà payé, solde calculé par la base,
 * puis Stripe Checkout sur le compte de l'artisan (aucune commission MENAO, règle 12).
 */
export default function BalanceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const load = useCallback(() => loadBalance(id), [id]);
  const [balance] = useFocusData(load);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (balance === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (balance === null) {
    return (
      <Screen header={<TopBar />}>
        <Notice tone="error">{fr.chantier.notFound}</Notice>
      </Screen>
    );
  }
  // Chantier pas encore réceptionné, ou solde déjà payé : retour au chantier.
  if (!balance.ready) return <Redirect href={`/chantier/${id}`} />;

  const amount = formatCents(balance.remainingCents);

  async function pay() {
    setFailure(null);
    setPending(true);
    const opened = await startBalancePayment(id);
    if ("error" in opened) {
      setPending(false);
      setFailure(opened.error);
      return;
    }
    const result = await openHostedPage(opened.url);
    setPending(false);
    if (result === "paiement") {
      router.dismissTo({ pathname: "/chantier/[id]", params: { id, retour: "paiement" } });
    }
  }

  return (
    <Screen
      band={
        <HeaderBand
          title={balance.title}
          meta={balance.address ? [{ icon: MapPin, text: balance.address }] : []}
        >
          <StepTabs steps={STEPS} current="solde" />
        </HeaderBand>
      }
      footer={
        balance.inProgress ? undefined : (
          <Button label={t.submit(amount)} onPress={pay} loading={pending} />
        )
      }
    >
      <Body muted>{t.intro}</Body>
      <Card>
        <View style={styles.summary}>
          <View style={styles.line}>
            <View style={styles.label}>
              <View style={[styles.dot, styles.dotDone]}>
                <Check size={13} color={colors["primary-strong"]} strokeWidth={2.6} />
              </View>
              <Text style={styles.muted}>{t.paid}</Text>
            </View>
            <Text style={styles.muted}>{formatCents(balance.paidCents)}</Text>
          </View>
          <View style={styles.line}>
            <View style={styles.label}>
              <View style={styles.dot}>
                <CircleDashed size={13} color={colors.primary} />
              </View>
              <Text style={styles.strong}>{t.today}</Text>
            </View>
            <Text style={styles.amount}>{amount}</Text>
          </View>
          <View style={[styles.line, styles.total]}>
            <Text style={styles.muted}>{t.total}</Text>
            <Text style={styles.muted}>{formatCents(balance.totalCents)}</Text>
          </View>
          <Text style={styles.text}>{t.beneficiary(balance.company)}</Text>
          <Text style={styles.small}>{t.direct}</Text>
          <Text style={styles.small}>{fr.quote.deposit.methods}</Text>
        </View>
      </Card>
      {balance.inProgress ? <Notice tone="info">{t.inProgress}</Notice> : null}
      {failure ? <Notice tone="error">{failure}</Notice> : null}
      <View style={styles.secure}>
        <Lock size={14} color={colors["muted-foreground"]} />
        <Text style={styles.small}>{fr.quote.deposit.secure}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  summary: { gap: spacing(3) },
  line: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing(3),
  },
  label: { flexDirection: "row", alignItems: "center", gap: spacing(3), flexShrink: 1 },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  dotDone: { backgroundColor: colors["primary-soft"] },
  total: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing(3) },
  text: { fontFamily: font.regular, fontSize: 14, color: colors.foreground },
  strong: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  muted: { fontFamily: font.regular, fontSize: 14, color: colors["muted-foreground"] },
  amount: { fontFamily: font.medium, fontSize: 20, color: colors.primary },
  small: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
  secure: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing(1.5),
  },
});
