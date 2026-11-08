import {
  QUOTE_VALIDITY_DAYS,
  isValidDepositPercent,
  parisToday,
  paymentSchedule,
} from "@menao/core";
import { sendQuoteSchema } from "@menao/validation";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { DateTimeFields } from "@/components/date-time-fields";
import { RadioCards } from "@/components/pro/action-kit";
import { PageHead } from "@/components/pro/dossier-kit";
import {
  CardHeading,
  FicheButton,
  FicheCard,
  FicheScreen,
  FicheSkeleton,
} from "@/components/pro/fiche-kit";
import { QuoteSteps } from "@/components/pro/quote-kit";
import { CheckRow, ToolField } from "@/components/pro/tools-kit";
import { fr } from "@/i18n/fr";
import { formatCents } from "@/lib/format";
import { loadQuoteSendContext, sendQuote } from "@/lib/pro-quotes";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice, celebrate } from "@/ui";
import { theme } from "@/ui/theme";
import { withTeamPermission } from "@/components/team-gate";

const t = fr.proQuote;
const s = t.send;
const { colors, font, radius, spacing } = theme;
type Schedule = "defaut" | "personnalise";
type Field = "depositPercent" | "startDate" | "durationDays";

/** Lendemain d'une date AAAA-MM-JJ : premier jour de début possible. */
const nextDay = (date: string) =>
  new Date(Date.parse(`${date}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

/**
 * « Envoi du devis » (F-21), comme sur le site : échéancier par défaut ou personnalisé (acompte à
 * la signature, solde à la réception, montants de @menao/core), dates des travaux (F-20), puis
 * envoi : la base attribue le numéro et fige le devis. Écran d'action « Nette » (lot 10) : cartes
 * Échéancier, Dates et récapitulatif (total TTC, client, chantier), bouton collé en bas.
 */
function QuoteSendScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const load = useCallback(() => loadQuoteSendContext(id), [id]);
  const [context] = useFocusData(load);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [deposit, setDeposit] = useState<string | null>(null);
  const [saveDefault, setSaveDefault] = useState(false);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [duration, setDuration] = useState("");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (context === undefined) return <FicheSkeleton title={t.barTitle} />;
  if (context === null) return <Redirect href={`/pro-chantier/${id}/devis`} />;

  const ctx = context;
  const customDeposit = deposit ?? String(ctx.defaultDeposit);
  const tranches = (percent: number) =>
    paymentSchedule(ctx.totalTtcCents, percent).map((tranche) =>
      s.tranche(tranche.percent, tranche.trigger, formatCents(tranche.amountCents)),
    );
  const custom = Number(customDeposit);

  async function submit() {
    if (!schedule) return setFailure(s.chooseSchedule);
    const parsed = sendQuoteSchema.safeParse({
      depositPercent: schedule === "defaut" ? String(ctx.defaultDeposit) : customDeposit,
      saveDefault: schedule === "personnalise" && saveDefault,
      startDate: startDate ?? "",
      durationDays: duration,
    });
    if (!parsed.success) {
      const fields = z.flattenError(parsed.error).fieldErrors;
      setErrors({
        depositPercent: fields.depositPercent?.[0],
        startDate: fields.startDate?.[0],
        durationDays: fields.durationDays?.[0],
      });
      return;
    }
    setErrors({});
    setFailure(null);
    setPending(true);
    const result = await sendQuote(ctx.quoteId, parsed.data);
    setPending(false);
    if (result && "startDate" in result) return setErrors({ startDate: result.startDate });
    if (result) return setFailure(result.error);
    // Moment de réussite (ADR 0197).
    celebrate(fr.moments.quoteSent);
    router.dismissTo({ pathname: "/pro-chantier/[id]", params: { id, envoye: "1" } });
  }

  return (
    <FicheScreen
      title={t.barTitle}
      footer={
        <FicheButton
          label={s.submit}
          tall
          onPress={submit}
          loading={pending}
          disabled={schedule === null}
        />
      }
    >
      <QuoteSteps current="send" />
      <PageHead title={s.title} />
      {!ctx.insured ? <Notice tone="error">{s.insuranceMissing}</Notice> : null}
      {failure ? <Notice tone="error">{failure}</Notice> : null}

      <FicheCard padding={4}>
        <CardHeading title={s.scheduleTitle} size={17} />
        <RadioCards
          legend={s.scheduleTitle}
          hideLegend
          options={[
            {
              value: "defaut" as const,
              label: s.defaultSchedule,
              detail: tranches(ctx.defaultDeposit).join("\n"),
            },
            { value: "personnalise" as const, label: s.customSchedule, detail: s.customHint },
          ]}
          value={schedule}
          onChange={(value) => {
            setSchedule(value);
            setFailure(null);
          }}
        />
        {schedule === "personnalise" ? (
          <View style={styles.custom}>
            <ToolField
              label={s.deposit}
              value={customDeposit}
              onChangeText={(value) => {
                setDeposit(value);
                setErrors((prev) => ({ ...prev, depositPercent: undefined }));
              }}
              keyboardType="number-pad"
              maxLength={2}
              error={errors.depositPercent}
            />
            {isValidDepositPercent(custom)
              ? tranches(custom).map((line) => (
                  <Text key={line} style={styles.small}>
                    {line}
                  </Text>
                ))
              : null}
            <CheckRow label={s.saveDefault} checked={saveDefault} onChange={setSaveDefault} />
          </View>
        ) : null}
      </FicheCard>

      <FicheCard padding={4}>
        <CardHeading title={s.datesTitle} size={17} />
        <DateTimeFields
          date={startDate}
          minDate={nextDay(parisToday())}
          dateLabel={s.startDate}
          onDate={(value) => {
            setStartDate(value);
            setErrors((prev) => ({ ...prev, startDate: undefined }));
          }}
          error={errors.startDate}
        />
        <ToolField
          label={s.duration}
          value={duration}
          onChangeText={(value) => {
            setDuration(value);
            setErrors((prev) => ({ ...prev, durationDays: undefined }));
          }}
          keyboardType="number-pad"
          maxLength={4}
          error={errors.durationDays}
        />
        <Text style={styles.small}>{s.datesHint}</Text>
        <Text style={styles.small}>{s.validity(QUOTE_VALIDITY_DAYS)}</Text>
      </FicheCard>

      <FicheCard padding={4}>
        <View style={styles.total}>
          <Text style={styles.totalLabel}>{t.totalTtc}</Text>
          <Text style={styles.totalValue}>{formatCents(ctx.totalTtcCents)}</Text>
        </View>
        <CardHeading title={s.attachTitle} size={16} />
        <View style={styles.block}>
          <Text style={styles.eyebrow}>{s.client}</Text>
          {ctx.client.name ? <Text style={styles.strong}>{ctx.client.name}</Text> : null}
          {ctx.client.email ? <Text style={styles.text}>{ctx.client.email}</Text> : null}
          {ctx.client.phone ? <Text style={styles.text}>{ctx.client.phone}</Text> : null}
        </View>
        <View style={[styles.block, styles.blockBorder]}>
          <Text style={styles.eyebrow}>{s.chantier}</Text>
          <Text style={styles.strong}>{ctx.chantier.title}</Text>
          {ctx.chantier.summary ? <Text style={styles.small}>{ctx.chantier.summary}</Text> : null}
        </View>
        <Text style={styles.notice}>{s.clientNotice}</Text>
      </FicheCard>
    </FicheScreen>
  );
}

const styles = StyleSheet.create({
  custom: { gap: spacing(2) },
  total: { gap: spacing(1) },
  totalLabel: { fontFamily: font.semibold, fontSize: 14, color: colors.label },
  totalValue: {
    fontFamily: font.display,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -1,
    color: colors.foreground,
  },
  block: { gap: 2 },
  blockBorder: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing(3) },
  eyebrow: { fontFamily: font.semibold, fontSize: 13, color: colors["muted-foreground"] },
  strong: { fontFamily: font.semibold, fontSize: 15, lineHeight: 21, color: colors.foreground },
  text: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.label },
  small: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
  notice: {
    overflow: "hidden",
    borderRadius: radius.input,
    backgroundColor: colors["primary-soft"],
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(3),
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["primary-strong"],
  },
});

// Réservé selon la place dans l'entreprise (ADR 0241).
export default withTeamPermission("money", QuoteSendScreen);
