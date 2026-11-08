import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Lock } from "lucide-react-native";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  ActionScreen,
  ActionSubmit,
  JourneySteps,
  MoneyRow,
  PayCard,
  SectionLabel,
} from "@/components/pro/action-kit";
import { FicheCard, FicheScreen, FicheSkeleton } from "@/components/pro/fiche-kit";
import { fr } from "@/i18n/fr";
import { formatCents } from "@/lib/format";
import { openHostedPage } from "@/lib/hosted";
import { loadBalance, startBalancePayment } from "@/lib/reception";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.balance;
const d = fr.quote.deposit;
const { colors, font, spacing } = theme;
// Fin de chantier (F-27) : PV, solde, puis avis.
const STEPS = [fr.reception.steps.pv, fr.reception.steps.solde, fr.clientReview.steps.avis];

/**
 * Paiement du solde (F-32), comme sur le site : montant déjà payé, solde calculé par la base,
 * puis Stripe Checkout sur le compte de l'artisan (aucune commission MENAO, règle 12).
 * Écran « Nette » (lot 11) : carte de paiement, récapitulatif du chantier et bouton « Payer … »
 * collé en bas.
 */
export default function BalanceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const load = useCallback(() => loadBalance(id), [id]);
  const [balance] = useFocusData(load);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (balance === undefined) return <FicheSkeleton title={t.title} />;
  if (balance === null) {
    return (
      <FicheScreen title={t.title}>
        <Notice tone="error">{fr.chantier.notFound}</Notice>
      </FicheScreen>
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
    <ActionScreen
      bar={t.title}
      steps={<JourneySteps label={fr.reception.stepsLabel} steps={STEPS} current={1} />}
      title={t.title}
      lead={t.intro}
      meta={[balance.title, balance.address].filter(Boolean).join(" · ")}
      footer={
        balance.inProgress ? undefined : (
          <ActionSubmit
            label={t.submit(amount)}
            onPress={pay}
            loading={pending}
            footnote={d.secure}
            footnoteIcon={Lock}
          />
        )
      }
    >
      <PayCard
        title={t.today}
        amount={amount}
        rows={[{ label: d.beneficiaryLabel, value: balance.company }]}
      >
        <Text style={styles.small}>{t.direct}</Text>
        <Text style={styles.small}>{d.methods}</Text>
      </PayCard>
      {balance.inProgress ? <Notice tone="info">{t.inProgress}</Notice> : null}
      {failure ? <Notice tone="error">{failure}</Notice> : null}
      <FicheCard padding={4} gap={0}>
        <View style={styles.head}>
          <SectionLabel text={t.chantierTitle} />
        </View>
        <MoneyRow label={t.total} value={formatCents(balance.totalCents)} />
        <MoneyRow label={t.paid} value={formatCents(balance.paidCents)} />
        <MoneyRow label={t.today} value={amount} strong />
      </FicheCard>
    </ActionScreen>
  );
}

const styles = StyleSheet.create({
  head: { paddingBottom: spacing(2) },
  small: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors["muted-foreground"],
  },
});
