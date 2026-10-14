import { dateLong } from "@menao/documents";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Lock, MapPin } from "lucide-react-native";
import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { HeaderBand } from "@/components/header-band";
import { StepTabs } from "@/components/step-tabs";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { formatCents } from "@/lib/format";
import { openHostedPage } from "@/lib/hosted";
import { loadQuote, startDepositPayment } from "@/lib/quotes";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Button, Card, Notice, Screen } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.quote;
const { colors, font, spacing } = theme;
const STEPS = [
  { key: "sign", label: t.steps.sign },
  { key: "deposit", label: t.steps.deposit },
] as const;

/**
 * Paiement de l'acompte (F-31), comme sur le site : montant de l'échéancier figé à l'envoi, puis
 * Stripe Checkout sur le compte de l'artisan (aucune commission MENAO, CLAUDE.md règle 12).
 */
export default function DepositScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const load = useCallback(() => loadQuote(id), [id]);
  const [quote] = useFocusData(load);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (quote === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (quote === null) {
    return (
      <Screen header={<TopBar />}>
        <Notice tone="error">{t.notFound}</Notice>
      </Screen>
    );
  }
  // Devis pas encore signé, ou acompte déjà payé : retour au devis.
  if (quote.status !== "signe" || quote.deposit?.status === "paye") {
    return <Redirect href={`/devis/${id}`} />;
  }

  const [deposit, balance] = quote.data.schedule;
  const amount = formatCents(deposit?.amountCents ?? 0);
  const inProgress = quote.deposit?.status === "en_cours";

  async function pay() {
    setFailure(null);
    setPending(true);
    const opened = await startDepositPayment(id);
    if ("error" in opened) {
      setPending(false);
      setFailure(opened.error);
      return;
    }
    const result = await openHostedPage(opened.url);
    setPending(false);
    if (result === "paiement") {
      router.dismissTo({ pathname: "/devis/[id]", params: { id, retour: "paiement" } });
    }
  }

  return (
    <Screen
      band={
        <HeaderBand
          title={quote.data.site.title}
          meta={[{ icon: MapPin, text: quote.data.site.addressLines.join(", ") }]}
        >
          <StepTabs steps={STEPS} current="deposit" />
        </HeaderBand>
      }
      footer={
        inProgress ? undefined : (
          <Button label={t.deposit.submit(amount)} onPress={pay} loading={pending} />
        )
      }
    >
      <Body muted>{t.deposit.intro}</Body>
      <Card>
        <View style={styles.summary}>
          {quote.data.startDate ? (
            <Text style={styles.muted}>{t.deposit.start(dateLong(quote.data.startDate))}</Text>
          ) : null}
          <View style={styles.line}>
            <Text style={styles.strong}>{t.deposit.today}</Text>
            <Text style={styles.amount}>{amount}</Text>
          </View>
          <View style={styles.line}>
            <Text style={styles.muted}>{t.deposit.later}</Text>
            <Text style={styles.muted}>{formatCents(balance?.amountCents ?? 0)}</Text>
          </View>
          <Text style={styles.text}>{t.deposit.beneficiary(quote.data.issuer.name)}</Text>
          <Text style={styles.small}>{t.deposit.methods}</Text>
        </View>
      </Card>
      {inProgress ? <Notice tone="info">{t.depositInProgress}</Notice> : null}
      {failure ? <Notice tone="error">{failure}</Notice> : null}
      <View style={styles.secure}>
        <Lock size={14} color={colors["muted-foreground"]} />
        <Text style={styles.small}>{t.deposit.secure}</Text>
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
  summary: { gap: spacing(2.5) },
  line: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: spacing(3),
  },
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
