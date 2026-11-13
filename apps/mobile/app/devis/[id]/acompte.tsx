import { dateLong } from "@menao/documents";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { CalendarDays, Lock } from "lucide-react-native";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  ActionScreen,
  ActionSubmit,
  JourneySteps,
  PayCard,
  SectionLabel,
} from "@/components/pro/action-kit";
import { FicheCard, FicheScreen, FicheSkeleton } from "@/components/pro/fiche-kit";
import { IconSquare } from "@/components/pro/tools-kit";
import { fr } from "@/i18n/fr";
import { formatCents } from "@/lib/format";
import { openHostedPage } from "@/lib/hosted";
import { loadQuote, startDepositPayment } from "@/lib/quotes";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.quote;
const { colors, font, spacing } = theme;
const STEPS = [t.steps.sign, t.steps.deposit];

/**
 * Paiement de l'acompte (F-31), comme sur le site : montant de l'échéancier figé à l'envoi, puis
 * Stripe Checkout sur le compte de l'artisan (aucune commission MENAO, CLAUDE.md règle 12).
 * Écran « Nette » (lot 11) : étape 2 sur 2, carte de paiement, échéancier en lignes et bouton
 * « Payer … » collé en bas.
 */
export default function DepositScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const load = useCallback(() => loadQuote(id), [id]);
  const [quote] = useFocusData(load);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (quote === undefined) return <FicheSkeleton title={t.deposit.title} />;
  if (quote === null) {
    return (
      <FicheScreen title={t.deposit.title}>
        <Notice tone="error">{t.notFound}</Notice>
      </FicheScreen>
    );
  }
  // Devis pas encore signé, ou acompte déjà payé : retour au devis.
  if (quote.status !== "signe" || quote.deposit?.status === "paye") {
    return <Redirect href={`/devis/${id}`} />;
  }

  // Par moment de paiement (F-146) : sans acompte, la première tranche est celle de la réception.
  const deposit = quote.data.schedule.find((s) => s.trigger === "signature");
  const balance = quote.data.schedule.find((s) => s.trigger === "reception");
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

  const site = [quote.data.site.title, quote.data.site.addressLines.join(", ")]
    .filter(Boolean)
    .join(" · ");
  const rows = [
    { label: t.deposit.beneficiaryLabel, value: quote.data.issuer.name },
    ...(quote.data.startDate
      ? [{ label: t.deposit.startLabel, value: dateLong(quote.data.startDate) }]
      : []),
  ];
  const schedule = [
    {
      icon: Lock,
      tone: "primary" as const,
      label: t.deposit.depositLine(deposit?.percent ?? 0),
      detail: t.deposit.today,
      amount,
    },
    ...(balance
      ? [
          {
            icon: CalendarDays,
            tone: "neutral" as const,
            label: t.deposit.balanceLine(balance.percent),
            detail: t.deposit.later,
            amount: formatCents(balance.amountCents),
          },
        ]
      : []),
  ];

  return (
    <ActionScreen
      bar={t.deposit.title}
      steps={<JourneySteps label={t.steps.label} steps={STEPS} current={1} />}
      title={t.deposit.title}
      lead={t.deposit.intro}
      meta={site}
      footer={
        inProgress ? undefined : (
          <ActionSubmit
            label={t.deposit.submit(amount)}
            onPress={pay}
            loading={pending}
            footnote={t.deposit.secure}
            footnoteIcon={Lock}
          />
        )
      }
    >
      <PayCard title={t.deposit.today} amount={amount} rows={rows}>
        <Text style={styles.small}>{t.deposit.methods}</Text>
      </PayCard>
      {inProgress ? <Notice tone="info">{t.depositInProgress}</Notice> : null}
      {failure ? <Notice tone="error">{failure}</Notice> : null}
      <FicheCard padding={4} gap={0}>
        <View style={styles.scheduleHead}>
          <SectionLabel text={t.deposit.scheduleTitle} />
        </View>
        {schedule.map((line, i) => (
          <View
            key={line.label}
            style={[styles.tranche, i === schedule.length - 1 && styles.trancheLast]}
          >
            <IconSquare icon={line.icon} tone={line.tone} size={40} />
            <View style={styles.trancheText}>
              <Text style={styles.trancheLabel}>{line.label}</Text>
              <Text style={styles.small}>{line.detail}</Text>
            </View>
            <Text style={styles.trancheAmount}>{line.amount}</Text>
          </View>
        ))}
      </FicheCard>
    </ActionScreen>
  );
}

const styles = StyleSheet.create({
  small: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors["muted-foreground"],
  },
  tranche: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    paddingVertical: spacing(3),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  trancheLast: { paddingBottom: 0 },
  scheduleHead: { paddingBottom: spacing(2) },
  trancheText: { flex: 1, minWidth: 0, gap: 2 },
  trancheLabel: { fontFamily: font.bold, fontSize: 15, color: colors.foreground },
  trancheAmount: { fontFamily: font.display, fontSize: 17, color: colors.foreground },
});
