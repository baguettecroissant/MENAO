import {
  QUOTE_VALIDITY_DAYS,
  isValidDepositPercent,
  parisToday,
  paymentSchedule,
} from "@menao/core";
import { sendQuoteSchema } from "@menao/validation";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { User, Wrench } from "lucide-react-native";
import { useCallback, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { DateTimeFields } from "@/components/date-time-fields";
import { DetailBlock } from "@/components/pro/request-blocks";
import { HeaderBand, whenMeta } from "@/components/header-band";
import { StepTabs } from "@/components/step-tabs";
import { fr } from "@/i18n/fr";
import { formatCents } from "@/lib/format";
import { loadQuoteSendContext, sendQuote } from "@/lib/pro-quotes";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Button, Checkbox, Notice, Screen, ScreenSkeleton, TextField } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proQuote;
const s = t.send;
const { colors, font, radius, spacing } = theme;
const STEPS = [
  { key: "preview", label: t.steps.preview },
  { key: "send", label: t.steps.send },
] as const;
type Schedule = "defaut" | "personnalise";
type Field = "depositPercent" | "startDate" | "durationDays";

/** Lendemain d'une date AAAA-MM-JJ : premier jour de début possible. */
const nextDay = (date: string) =>
  new Date(Date.parse(`${date}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

/**
 * « Envoi du devis » (F-21), comme sur le site : échéancier par défaut ou personnalisé (acompte à
 * la signature, solde à la réception, montants de @menao/core), dates des travaux (F-20), puis
 * envoi : la base attribue le numéro et fige le devis.
 */
export default function QuoteSendScreen() {
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

  if (context === undefined) return <ScreenSkeleton />;
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
    router.dismissTo({ pathname: "/pro-chantier/[id]", params: { id, envoye: "1" } });
  }

  const option = (value: Schedule, title: string, body: ReactNode) => (
    <Pressable
      role="radio"
      aria-checked={schedule === value}
      onPress={() => {
        setSchedule(value);
        setFailure(null);
      }}
      style={[styles.option, schedule === value && styles.optionOn]}
    >
      <View style={[styles.radio, schedule === value && styles.radioOn]}>
        {schedule === value ? <View style={styles.radioDot} /> : null}
      </View>
      <View style={styles.optionText}>
        <Text style={styles.strong}>{title}</Text>
        {body}
      </View>
    </Pressable>
  );

  return (
    <Screen
      band={
        <HeaderBand title={t.title} meta={whenMeta(ctx.appointmentAt)}>
          <StepTabs steps={STEPS} current="send" />
        </HeaderBand>
      }
      footer={
        <Button label={s.submit} onPress={submit} loading={pending} disabled={schedule === null} />
      }
    >
      {!ctx.insured ? <Notice tone="error">{s.insuranceMissing}</Notice> : null}
      {failure ? <Notice tone="error">{failure}</Notice> : null}

      <View style={styles.section}>
        <Text role="heading" style={styles.heading}>
          {s.scheduleTitle}
        </Text>
        <View role="radiogroup" aria-label={s.scheduleTitle} style={styles.options}>
          {option(
            "defaut",
            s.defaultSchedule,
            tranches(ctx.defaultDeposit).map((line) => (
              <Text key={line} style={styles.small}>
                • {line}
              </Text>
            )),
          )}
          {option(
            "personnalise",
            s.customSchedule,
            <Text style={styles.small}>{s.customHint}</Text>,
          )}
        </View>
        {schedule === "personnalise" ? (
          <View style={styles.custom}>
            <TextField
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
                    • {line}
                  </Text>
                ))
              : null}
            <Checkbox label={s.saveDefault} checked={saveDefault} onChange={setSaveDefault} />
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text role="heading" style={styles.heading}>
          {s.datesTitle}
        </Text>
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
        <TextField
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
        <Body muted>{s.datesHint}</Body>
        <Text style={styles.small}>{s.validity(QUOTE_VALIDITY_DAYS)}</Text>
      </View>

      <View style={styles.section}>
        <Text role="heading" style={styles.heading}>
          {s.attachTitle}
        </Text>
        <DetailBlock icon={<User size={18} color={colors.primary} />} title={s.client}>
          {ctx.client.name ? <Text style={styles.strong}>{ctx.client.name}</Text> : null}
          {ctx.client.email ? <Text style={styles.text}>{ctx.client.email}</Text> : null}
          {ctx.client.phone ? <Text style={styles.text}>{ctx.client.phone}</Text> : null}
          <Text style={styles.notice}>{s.clientNotice}</Text>
        </DetailBlock>
        <DetailBlock icon={<Wrench size={18} color={colors.primary} />} title={s.chantier}>
          <Text style={styles.strong}>{ctx.chantier.title}</Text>
          {ctx.chantier.summary ? <Text style={styles.small}>{ctx.chantier.summary}</Text> : null}
        </DetailBlock>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing(3) },
  heading: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  options: { gap: spacing(3) },
  option: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing(3),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing(4),
  },
  optionOn: { borderColor: colors.primary, backgroundColor: colors["primary-softer"] },
  optionText: { flex: 1, gap: spacing(1) },
  radio: {
    width: 22,
    height: 22,
    marginTop: 1,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors["border-strong"],
    alignItems: "center",
    justifyContent: "center",
  },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.primary },
  custom: {
    gap: spacing(2),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing(4),
  },
  strong: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  text: { fontFamily: font.regular, fontSize: 14, color: colors.foreground },
  small: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
  notice: { fontFamily: font.regular, fontSize: 12, color: colors["primary-strong"] },
});
