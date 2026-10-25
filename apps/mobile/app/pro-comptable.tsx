import {
  ACCOUNTANT_PERIODS,
  accountantPeriodRange,
  accountantRangeLabel,
  nextAccountantSendLabel,
  parisToday,
  type AccountantPeriod,
} from "@menao/core";
import { accountantSettingsSchema } from "@menao/validation";
import { Send } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import {
  loadAccountant,
  saveAccountantSettings,
  sendAccountantExportNow,
  type AccountantSendResult,
  type AccountantView,
} from "@/lib/accountant";
import { formatDay } from "@/lib/format";
import { useFocusData } from "@/lib/use-focus-data";
import {
  Body,
  Button,
  Card,
  Checkbox,
  Chip,
  Notice,
  Screen,
  ScreenSkeleton,
  TextField,
  Title,
  toast,
} from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proAccountant;
const { colors, font, spacing } = theme;

/**
 * Envoi au comptable (F-63), comme sur le site : réglages de l'envoi automatique, « Envoyer
 * maintenant » pour la dernière période complète et derniers envois.
 */
export default function AccountantScreen() {
  const [view, reload] = useFocusData(loadAccountant);
  if (view === undefined) return <ScreenSkeleton header={<TopBar />} />;
  return (
    <Screen header={<TopBar />} onRefresh={reload}>
      <View style={styles.head}>
        <Title>{t.title}</Title>
        <Body muted>{t.subtitle}</Body>
      </View>
      {view === null ? (
        <Notice tone="error">{t.error}</Notice>
      ) : (
        <AccountantContent view={view} onChange={reload} />
      )}
    </Screen>
  );
}

function AccountantContent({
  view,
  onChange,
}: {
  view: AccountantView;
  onChange: () => Promise<void>;
}) {
  const { settings, exports } = view;
  const [enabled, setEnabled] = useState(settings?.enabled ?? false);
  const [email, setEmail] = useState(settings?.email ?? "");
  const [period, setPeriod] = useState<AccountantPeriod>(settings?.period ?? "mensuel");
  const [includeInvoices, setIncludeInvoices] = useState(settings?.include_invoices ?? true);
  const [includeExpenses, setIncludeExpenses] = useState(settings?.include_expenses ?? true);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<AccountantSendResult | null>(null);
  const today = parisToday();
  const saved = settings !== null;
  const savedPeriod: AccountantPeriod = settings?.period ?? "mensuel";
  const lastPeriod = accountantPeriodRange(savedPeriod, today).label;

  async function save() {
    const parsed = accountantSettingsSchema.safeParse({
      enabled,
      email,
      period,
      includeInvoices,
      includeExpenses,
    });
    if (!parsed.success) {
      const fieldErrors = z.flattenError(parsed.error).fieldErrors as Record<
        string,
        string[] | undefined
      >;
      setErrors(Object.fromEntries(Object.entries(fieldErrors).map(([k, v]) => [k, v?.[0]])));
      return;
    }
    setErrors({});
    setSaving(true);
    const ok = await saveAccountantSettings(parsed.data);
    setSaving(false);
    if (!ok) return toast.error(t.saveError);
    toast.success(t.saved);
    await onChange();
  }

  async function send() {
    setResult(null);
    setSending(true);
    const outcome = await sendAccountantExportNow();
    setSending(false);
    setResult(outcome);
    await onChange();
  }

  return (
    <>
      <Card>
        <Checkbox label={t.enabled} checked={enabled} onChange={setEnabled} />
        <TextField
          label={t.email}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          error={errors.email}
        />
        <Text style={styles.label}>{t.period}</Text>
        <View style={styles.chips}>
          {ACCOUNTANT_PERIODS.map((value) => (
            <Chip
              key={value}
              label={t.periods[value].label}
              selected={period === value}
              onPress={() => setPeriod(value)}
            />
          ))}
        </View>
        <Body muted>{t.periods[period].detail}</Body>
        <Text style={styles.label}>{t.parts}</Text>
        <Checkbox label={t.invoices} checked={includeInvoices} onChange={setIncludeInvoices} />
        <Checkbox
          label={t.expenses}
          checked={includeExpenses}
          onChange={setIncludeExpenses}
          error={errors.includeExpenses}
        />
        <Body muted>
          {settings?.enabled ? t.next(nextAccountantSendLabel(savedPeriod, today)) : t.off}
        </Body>
        <Button label={t.save} loading={saving} onPress={() => void save()} />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>{t.sendTitle}</Text>
        {saved ? (
          <>
            <Body muted>{t.sendLead(lastPeriod, settings.email)}</Body>
            {result?.status === "envoye" ? (
              <Notice tone="success">{t.sent(result.period)}</Notice>
            ) : result ? (
              <Notice tone="error">{t.sendErrors[result.status]}</Notice>
            ) : null}
            <Button
              label={t.send(lastPeriod)}
              variant="secondary"
              icon={Send}
              loading={sending}
              onPress={() => void send()}
            />
          </>
        ) : (
          <Body muted>{t.saveFirst}</Body>
        )}
      </Card>

      <Card>
        <Text style={styles.cardTitle}>{t.historyTitle}</Text>
        {exports.length === 0 ? (
          <Body muted>{t.historyEmpty}</Body>
        ) : (
          exports.map((row) => (
            <View key={row.id} style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>
                  {accountantRangeLabel(row.period_start, row.period_end)}
                </Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {t.historyLine(formatDay(row.created_at), row.recipient)}
                </Text>
                <Text style={styles.rowMeta}>
                  {[t.kinds[row.kind], t.counts(row.invoices_count, row.expenses_count)]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </View>
              <Text style={[styles.status, row.status === "envoye" ? styles.ok : styles.ko]}>
                {t.statuses[row.status]}
              </Text>
            </View>
          ))
        )}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  head: { gap: spacing(1.5) },
  label: { fontFamily: font.medium, fontSize: 14, color: colors.foreground },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  cardTitle: { fontFamily: font.medium, fontSize: 17, color: colors.foreground },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing(3),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingVertical: spacing(2),
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  rowMeta: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
  status: { fontFamily: font.medium, fontSize: 13 },
  ok: { color: colors.success },
  ko: { color: colors.danger },
});
