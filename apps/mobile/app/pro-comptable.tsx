import {
  ACCOUNTANT_PERIODS,
  accountantPeriodRange,
  accountantRangeLabel,
  nextAccountantSendLabel,
  parisToday,
  type AccountantPeriod,
} from "@menao/core";
import { accountantSettingsSchema } from "@menao/validation";
import { CircleAlert, CircleCheck, Send } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { GroupTitle, ListGroup } from "@/components/list-kit";
import {
  capitalize,
  CardHeading,
  FicheButton,
  FicheCard,
  FicheScreen,
  FicheSkeleton,
  FicheTag,
} from "@/components/pro/fiche-kit";
import { MoneyFigures, type MoneyFigure } from "@/components/pro/money-kit";
import {
  CheckRow,
  ChoiceCards,
  IconSquare,
  SwitchCard,
  ToolField,
} from "@/components/pro/tools-kit";
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
import { Notice, toast } from "@/ui";
import { theme } from "@/ui/theme";
import { withTeamPermission } from "@/components/team-gate";

const t = fr.proAccountant;
const { colors, font, spacing } = theme;

/**
 * Envoi au comptable (F-63), comme sur le site : réglages de l'envoi automatique, « Envoyer
 * maintenant » pour la dernière période complète et derniers envois. Refonte « Nette » (lot 8,
 * maquette « ComptableNette » en une colonne) : chiffres d'après les réglages et les envois déjà
 * enregistrés, carte Réglages (interrupteur, rythme en deux cartes, cases), « Envoyer maintenant ».
 */
function AccountantScreen() {
  const [view, reload] = useFocusData(loadAccountant);
  if (view === undefined) return <FicheSkeleton title={t.title} />;
  return (
    <FicheScreen title={t.title} onRefresh={reload}>
      <Text style={styles.lead}>{t.subtitle}</Text>
      {view === null ? (
        <Notice tone="error">{t.error}</Notice>
      ) : (
        <AccountantContent view={view} onChange={reload} />
      )}
    </FicheScreen>
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

  // Chiffres d'après ce qui est déjà enregistré : rien d'inventé avant le premier réglage.
  const latest = exports[0];
  const figures: MoneyFigure[] = [
    ...(saved
      ? [
          settings.enabled
            ? {
                label: t.figures.next,
                value: nextAccountantSendLabel(savedPeriod, today),
                hint: t.figures.nextHint(t.periods[savedPeriod].label),
              }
            : { label: t.figures.auto, value: t.figures.off, hint: t.figures.offHint },
        ]
      : []),
    ...(latest
      ? [
          {
            label: t.figures.last,
            value: capitalize(accountantRangeLabel(latest.period_start, latest.period_end)),
            hint: t.figures.lastHint(t.statuses[latest.status], formatDay(latest.created_at)),
          },
        ]
      : []),
  ];

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
      {figures.length > 0 ? <MoneyFigures figures={figures} /> : null}

      <FicheCard gap={4}>
        <CardHeading title={t.settingsTitle} />
        <SwitchCard label={t.enabled} value={enabled} onChange={setEnabled} soft />
        <ToolField
          label={t.email}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          error={errors.email}
        />
        <ChoiceCards
          label={t.period}
          value={period}
          onChange={setPeriod}
          options={ACCOUNTANT_PERIODS.map((value) => ({
            value,
            label: t.periods[value].label,
            detail: t.periods[value].detail,
          }))}
        />
        <View>
          <Text style={styles.label}>{t.parts}</Text>
          <CheckRow label={t.invoices} checked={includeInvoices} onChange={setIncludeInvoices} />
          <CheckRow label={t.expenses} checked={includeExpenses} onChange={setIncludeExpenses} />
          {errors.includeExpenses ? (
            <Text style={styles.error}>{errors.includeExpenses}</Text>
          ) : null}
        </View>
        <Text style={styles.muted}>
          {settings?.enabled ? t.next(nextAccountantSendLabel(savedPeriod, today)) : t.off}
        </Text>
        <FicheButton label={t.save} loading={saving} onPress={() => void save()} />
      </FicheCard>

      <FicheCard gap={3}>
        <CardHeading title={t.sendTitle} size={17} />
        {saved ? (
          <>
            <Text style={styles.lead}>{t.sendLead(lastPeriod, settings.email)}</Text>
            {result?.status === "envoye" ? (
              <Notice tone="success">{t.sent(result.period)}</Notice>
            ) : result ? (
              <Notice tone="error">{t.sendErrors[result.status]}</Notice>
            ) : null}
            <FicheButton
              label={t.send(lastPeriod)}
              icon={Send}
              loading={sending}
              onPress={() => void send()}
            />
          </>
        ) : (
          <Text style={styles.muted}>{t.saveFirst}</Text>
        )}
      </FicheCard>

      <GroupTitle title={t.historyTitle} count={exports.length} />
      {exports.length === 0 ? (
        <Text style={styles.muted}>{t.historyEmpty}</Text>
      ) : (
        <ListGroup>
          {exports.map((row) => {
            const ok = row.status === "envoye";
            return (
              <View key={row.id} style={styles.row}>
                <IconSquare
                  icon={ok ? CircleCheck : CircleAlert}
                  tone={ok ? "success" : "danger"}
                />
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>
                    {capitalize(accountantRangeLabel(row.period_start, row.period_end))}
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
                <FicheTag text={t.statuses[row.status]} tone={ok ? "success" : "danger"} />
              </View>
            );
          })}
        </ListGroup>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  lead: { fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: colors.label },
  label: { fontFamily: font.semibold, fontSize: 14, color: colors.foreground },
  muted: {
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors["muted-foreground"],
  },
  error: { fontFamily: font.regular, fontSize: 13, color: colors.danger },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3.5),
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3.5),
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: font.semibold, fontSize: 15, color: colors.foreground },
  rowMeta: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
});

// Réservé selon la place dans l'entreprise (ADR 0241).
export default withTeamPermission("accounting", AccountantScreen);
