import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Lock } from "lucide-react-native";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ActionScreen, ActionSubmit } from "@/components/pro/action-kit";
import { FicheCard, FicheScreen, FicheSkeleton } from "@/components/pro/fiche-kit";
import { PaymentTimeline } from "@/components/pro/payment-schedule";
import { fr } from "@/i18n/fr";
import { formatCents, formatDay } from "@/lib/format";
import { openHostedPage } from "@/lib/hosted";
import { loadStartPayment, startStartPayment } from "@/lib/reception";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.startPayment;
const { colors, font, radius, spacing } = theme;

/**
 * Paiement au démarrage des travaux (F-146, maquette lot 40), comme sur le site : carte
 * « Travaux commencés » avec la part prévue, frise de l'échéancier, puis Stripe Checkout sur le
 * compte de l'artisan (aucune commission MENAO, règle 12), bouton « Payer … » collé en bas.
 */
export default function StartPaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const load = useCallback(() => loadStartPayment(id), [id]);
  const [data] = useFocusData(load);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (data === undefined) return <FicheSkeleton title={t.title} />;
  if (data === null) {
    return (
      <FicheScreen title={t.title}>
        <Notice tone="error">{fr.chantier.notFound}</Notice>
      </FicheScreen>
    );
  }
  if (!data.ready) return <Redirect href={`/chantier/${id}`} />;

  const amount = formatCents(data.amountCents);

  async function pay() {
    setFailure(null);
    setPending(true);
    const opened = await startStartPayment(id);
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
      bar={data.title}
      title={t.title}
      meta={[data.title, data.address].filter(Boolean).join(" · ")}
      footer={
        data.inProgress ? undefined : (
          <ActionSubmit
            label={t.submit(amount)}
            onPress={pay}
            loading={pending}
            footnote={fr.quote.deposit.secure}
            footnoteIcon={Lock}
          />
        )
      }
    >
      <View style={styles.hero}>
        <Text style={styles.chip}>{t.chip}</Text>
        <Text style={styles.heroTitle}>{t.title}</Text>
        <Text style={styles.heroText}>
          {t.started(data.startAt ? formatDay(data.startAt) : null, data.percent)}
        </Text>
        <Text style={styles.heroAmount}>{amount}</Text>
      </View>
      {data.inProgress ? <Notice tone="info">{t.inProgress}</Notice> : null}
      {failure ? <Notice tone="error">{failure}</Notice> : null}
      <FicheCard padding={4}>
        <PaymentTimeline
          steps={[
            {
              label: t.steps.signature,
              detail:
                data.depositCents > 0
                  ? data.depositPaid
                    ? t.depositPaid(formatCents(data.depositCents))
                    : t.depositDue(formatCents(data.depositCents))
                  : t.noDeposit,
              state: "done",
            },
            { label: t.steps.demarrage, detail: t.startNow(amount), state: "now" },
            {
              label: t.steps.reception,
              detail: t.balance(formatCents(data.receptionCents)),
              state: "todo",
            },
          ]}
        />
      </FicheCard>
      <Text style={styles.note}>{t.beneficiary(data.company)}</Text>
      <Text style={styles.note}>{t.secure}</Text>
    </ActionScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing(2),
    padding: spacing(4),
    borderRadius: radius.card,
    backgroundColor: colors["violet-soft"],
  },
  chip: {
    alignSelf: "flex-start",
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: colors.violet,
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1),
    fontFamily: font.semibold,
    fontSize: 12,
    color: "#ffffff",
  },
  heroTitle: { fontFamily: font.display, fontSize: 20, lineHeight: 26, color: colors.foreground },
  heroText: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.label },
  heroAmount: {
    fontFamily: font.display,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.6,
    color: colors.foreground,
  },
  note: {
    fontFamily: font.regular,
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: "center",
    color: colors["muted-foreground"],
  },
});
