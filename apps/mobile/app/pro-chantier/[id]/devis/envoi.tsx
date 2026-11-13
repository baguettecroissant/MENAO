import {
  QUOTE_VALIDITY_DAYS,
  formatRateBp,
  parisToday,
  paymentSchedule,
  paymentScheduleError,
} from "@menao/core";
import { messages, sendQuoteSchema } from "@menao/validation";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { DateTimeFields } from "@/components/date-time-fields";
import { PageHead } from "@/components/pro/dossier-kit";
import { ScheduleBar, TrancheRow } from "@/components/pro/payment-schedule";
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
type Field = "depositPercent" | "startPercent" | "startDate" | "durationDays";

/** Lendemain d'une date AAAA-MM-JJ : premier jour de début possible. */
const nextDay = (date: string) =>
  new Date(Date.parse(`${date}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

/**
 * « Envoi du devis » (F-21) : échéancier (maquette lot 40 : total, barre, acompte et démarrage
 * réglables à partir de l'échéancier par défaut, 0 % possible, solde calculé ; montants de
 * @menao/core), dates des travaux (F-20), puis envoi : la base attribue le numéro et fige le
 * devis. Écran d'action « Nette » (lot 10) : cartes Échéancier, Dates et récapitulatif (client,
 * chantier), bouton collé en bas.
 */
function QuoteSendScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const load = useCallback(() => loadQuoteSendContext(id), [id]);
  const [context] = useFocusData(load);
  const [deposit, setDeposit] = useState<string | null>(null);
  const [start, setStart] = useState<string | null>(null);
  const [saveDefault, setSaveDefault] = useState(false);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [duration, setDuration] = useState("");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (context === undefined) return <FicheSkeleton title={t.barTitle} />;
  if (context === null) return <Redirect href={`/pro-chantier/${id}/devis`} />;

  const ctx = context;
  const depositValue = deposit ?? String(ctx.defaultDeposit);
  const startValue = start ?? String(ctx.defaultStart);
  const d = Number(depositValue) || 0;
  const st = Number(startValue) || 0;
  const invalid = depositValue === "" || startValue === "" || paymentScheduleError(d, st) !== null;
  const tranches = paymentSchedule(ctx.totalTtcCents, invalid ? 0 : d, invalid ? 0 : st);
  const balanceError = invalid && d + st > 99 ? messages.scheduleNoBalance : null;

  async function submit() {
    const parsed = sendQuoteSchema.safeParse({
      depositPercent: depositValue,
      startPercent: startValue,
      saveDefault,
      startDate: startDate ?? "",
      durationDays: duration,
    });
    if (!parsed.success) {
      const fields = z.flattenError(parsed.error).fieldErrors;
      setErrors({
        depositPercent: fields.depositPercent?.[0],
        startPercent: fields.startPercent?.[0],
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
        <FicheButton label={s.submit} tall onPress={submit} loading={pending} disabled={invalid} />
      }
    >
      <QuoteSteps current="send" />
      <PageHead title={s.title} />
      {!ctx.insured ? <Notice tone="error">{s.insuranceMissing}</Notice> : null}
      {ctx.lowMargin ? (
        <Notice tone="info">
          {fr.proQuote.library.below(
            formatRateBp(ctx.lowMargin.markupBp),
            formatRateBp(ctx.lowMargin.alertBp),
          )}
        </Notice>
      ) : null}
      {failure ? <Notice tone="error">{failure}</Notice> : null}

      <FicheCard padding={4}>
        <View style={styles.total}>
          <Text style={styles.totalLabel}>{t.totalTtc}</Text>
          <Text style={styles.totalValue}>{formatCents(ctx.totalTtcCents)}</Text>
        </View>
        <ScheduleBar tranches={tranches} />
        <View>
          <TrancheRow
            first
            trigger="signature"
            title={s.rows.signature.title}
            hint={s.rows.signature.hint}
            percent={d}
            value={depositValue}
            label={s.percentLabel(s.rows.signature.title)}
            invalid={Boolean(errors.depositPercent)}
            onChange={(value) => {
              setDeposit(value);
              setErrors((prev) => ({ ...prev, depositPercent: undefined }));
            }}
          />
          <TrancheRow
            trigger="demarrage"
            title={s.rows.demarrage.title}
            hint={s.rows.demarrage.hint}
            percent={st}
            value={startValue}
            label={s.percentLabel(s.rows.demarrage.title)}
            invalid={Boolean(errors.startPercent) || balanceError !== null}
            onChange={(value) => {
              setStart(value);
              setErrors((prev) => ({ ...prev, startPercent: undefined }));
            }}
          />
          <TrancheRow
            trigger="reception"
            title={s.rows.reception.title}
            hint={s.rows.reception.hint}
            percent={
              invalid
                ? Math.max(0, 100 - d - st)
                : (tranches.find((x) => x.trigger === "reception")?.percent ?? 0)
            }
          />
        </View>
        {balanceError || errors.depositPercent || errors.startPercent ? (
          <Text style={styles.error}>
            {balanceError ?? errors.depositPercent ?? errors.startPercent}
          </Text>
        ) : null}
        {tranches.map((tranche) => (
          <Text key={tranche.trigger} style={styles.small}>
            {s.tranche(tranche.percent, tranche.trigger, formatCents(tranche.amountCents))}
          </Text>
        ))}
        <Text style={styles.small}>{s.zeroHint}</Text>
        <CheckRow label={s.saveDefault} checked={saveDefault} onChange={setSaveDefault} />
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
  error: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: colors.danger },
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
