import {
  BUDGET_MINIMUM_OPTIONS,
  DIPLOMES_METIER,
  parisToday,
  validRgeDomains,
  type BudgetMinimum,
  type DiplomeMetier,
} from "@menao/core";
import { CERTIFICATION_TYPES, type CertificationType } from "@menao/validation";
import { Trash2 } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { DateTimeFields } from "@/components/date-time-fields";
import { PageHead } from "@/components/pro/dossier-kit";
import {
  CardHeading,
  FicheButton,
  FicheCard,
  FicheScreen,
  FicheSkeleton,
  FicheTag,
} from "@/components/pro/fiche-kit";
import { ToolField } from "@/components/pro/tools-kit";
import { CheckRow, ChoiceGroup } from "@/components/pro-signup/signup-parts";
import { fr } from "@/i18n/fr";
import { formatLongDate } from "@/lib/dates";
import {
  addCertification,
  deleteCertification,
  loadTrades,
  refreshRge,
  saveTrades,
  type FieldErrors,
  type TradesData,
} from "@/lib/my-company";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice, toast } from "@/ui";
import { theme } from "@/ui/theme";
import { withTeamPermission } from "@/components/team-gate";

const t = fr.proTrades;
const { colors, font, radius, spacing } = theme;

type Message = { tone: "error" | "success"; text: string } | null;

/**
 * Métiers, spécialités, expérience, certifications et RGE (ADR 0125), comme l'étape « Métiers »
 * du site : mêmes contrôles, mêmes écritures (set_artisan_trades, certifications, rge-check).
 * Refonte « Nette » (lot 9) : grand titre, cartes, « Enregistrer mes métiers » collé en bas.
 */
function TradesScreen() {
  const [data, reload] = useFocusData(loadTrades);
  if (data === undefined) return <FicheSkeleton />;
  if (data === null) {
    return (
      <FicheScreen onRefresh={reload}>
        <PageHead title={t.title} />
        <Notice tone="error">{t.loadError}</Notice>
      </FicheScreen>
    );
  }
  return <TradesContent data={data} onChange={reload} />;
}

/** Métiers (avec « Enregistrer mes métiers » collé en bas), puis RGE et certifications. */
function TradesContent({ data, onChange }: { data: TradesData; onChange: () => Promise<void> }) {
  const [trades, setTrades] = useState(() => new Set(data.selectedTrades));
  const [workTypes, setWorkTypes] = useState(() => new Set(data.selectedWorkTypes));
  const [experience, setExperience] = useState(
    data.experienceYears === null ? "" : String(data.experienceYears),
  );
  const [diploma, setDiploma] = useState<DiplomeMetier | "">(data.diploma ?? "");
  const [budgetMinimum, setBudgetMinimum] = useState<BudgetMinimum | "">(data.budgetMinimum ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<Message>(null);
  const [busy, setBusy] = useState(false);

  const toggle = (set: Set<string>, code: string) => {
    const next = new Set(set);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    return next;
  };

  async function save() {
    setBusy(true);
    setMessage(null);
    const result = await saveTrades({
      tradeCodes: [...trades],
      workTypeCodes: [...workTypes],
      experienceYears: experience,
      diploma,
      budgetMinimum,
      allowedWorkTypes: data.trades
        .filter((tr) => trades.has(tr.code))
        .flatMap((tr) => tr.workTypes.map((w) => w.code)),
    });
    setBusy(false);
    setErrors(result.ok ? {} : (result.fields ?? {}));
    if (!result.ok && result.error) setMessage({ tone: "error", text: result.error });
    if (result.ok) {
      toast.success(t.saved);
      await onChange();
    }
  }

  return (
    <FicheScreen
      onRefresh={onChange}
      footer={<FicheButton label={t.save} tall onPress={() => void save()} loading={busy} />}
    >
      <PageHead title={t.title} />
      <FicheCard padding={4.5} gap={3.5}>
        <CardHeading title={t.legend} size={17} />
        <Text style={styles.text}>{t.hint}</Text>
        {errors.tradeCodes ? <Notice tone="error">{errors.tradeCodes}</Notice> : null}
        <View style={styles.list}>
          {data.trades.map((trade) => (
            <View key={trade.code} style={styles.list}>
              <CheckRow
                label={trade.label}
                checked={trades.has(trade.code)}
                onToggle={() => setTrades((current) => toggle(current, trade.code))}
              />
              {trades.has(trade.code) && trade.workTypes.length > 0 ? (
                <View style={styles.specialties}>
                  <Text style={styles.subheading}>{t.specialties(trade.label)}</Text>
                  {trade.workTypes.map((work) => (
                    <CheckRow
                      key={work.code}
                      label={work.label}
                      checked={workTypes.has(work.code)}
                      onToggle={() => setWorkTypes((current) => toggle(current, work.code))}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          ))}
        </View>
        <ToolField
          label={t.experience}
          value={experience}
          onChangeText={setExperience}
          keyboardType="number-pad"
          error={errors.experienceYears}
        />
        <ChoiceGroup<DiplomeMetier | "">
          legend={t.diploma}
          hint={t.diplomaHint}
          value={diploma}
          options={[
            { value: "", label: t.diplomaNone },
            ...DIPLOMES_METIER.map((d) => ({ value: d, label: fr.diplomesMetier[d] })),
          ]}
          onChange={setDiploma}
        />
        <ChoiceGroup<BudgetMinimum | "">
          legend={t.budgetMinimum}
          hint={t.budgetMinimumHint}
          value={budgetMinimum}
          options={[
            { value: "", label: t.budgetMinimumAll },
            ...BUDGET_MINIMUM_OPTIONS.map((b) => ({ value: b, label: t.budgetMinimumOptions[b] })),
          ]}
          onChange={setBudgetMinimum}
        />
        {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
      </FicheCard>
      <RgeCard data={data} onChange={onChange} />
      <CertificationsCard data={data} onChange={onChange} />
    </FicheScreen>
  );
}

function RgeCard({ data, onChange }: { data: TradesData; onChange: () => Promise<void> }) {
  const [message, setMessage] = useState<Message>(null);
  const [busy, setBusy] = useState(false);
  const domains = validRgeDomains(data.rgeDomains, parisToday());

  async function refresh() {
    setBusy(true);
    setMessage(null);
    const status = await refreshRge();
    setBusy(false);
    setMessage({ tone: status === "ok" ? "success" : "error", text: t.rgeStatus[status] });
    await onChange();
  }

  return (
    <FicheCard padding={4.5} gap={3}>
      <CardHeading title={t.rgeTitle} size={17} />
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
      {domains.length > 0 ? (
        <>
          <Text style={styles.body}>{t.rgeFound}</Text>
          <View style={styles.tags}>
            {domains.map((domain) => (
              <FicheTag key={domain} text={domain} tone="primary" />
            ))}
          </View>
        </>
      ) : (
        <Text style={styles.text}>{t.rgeNone}</Text>
      )}
      {data.rgeCheckedAt ? (
        <Text style={styles.text}>{t.rgeCheckedOn(formatLongDate(data.rgeCheckedAt))}</Text>
      ) : null}
      <FicheButton
        label={t.rgeRefresh}
        variant="secondary"
        onPress={() => void refresh()}
        loading={busy}
      />
    </FicheCard>
  );
}

function CertificationsCard({
  data,
  onChange,
}: {
  data: TradesData;
  onChange: () => Promise<void>;
}) {
  const [type, setType] = useState<CertificationType | null>(null);
  const [numero, setNumero] = useState("");
  const [dateFin, setDateFin] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<Message>(null);
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    setMessage(null);
    const result = await addCertification({ type: type ?? "", numero, dateFin: dateFin ?? "" });
    setBusy(false);
    setErrors(result.ok ? {} : (result.fields ?? {}));
    if (!result.ok && result.error) setMessage({ tone: "error", text: result.error });
    if (result.ok) {
      setType(null);
      setNumero("");
      setDateFin(null);
      await onChange();
    }
  }

  async function remove(id: string) {
    setMessage(null);
    if (!(await deleteCertification(id))) setMessage({ tone: "error", text: fr.errors.generic });
    await onChange();
  }

  return (
    <FicheCard padding={4.5} gap={3.5}>
      <CardHeading title={t.certifications} size={17} />
      <Text style={styles.text}>{t.certificationsHint}</Text>
      {data.certifications.length === 0 ? (
        <Text style={styles.text}>{t.noCertification}</Text>
      ) : (
        <View style={styles.list}>
          {data.certifications.map((c) => {
            const label = `${t.certTypes[c.type]} · ${c.numero}`;
            return (
              <View key={c.id} style={styles.cert}>
                <View style={styles.certText}>
                  <Text style={styles.certTitle}>{label}</Text>
                  <Text style={styles.certHint}>{t.certValidUntil(formatLongDate(c.dateFin))}</Text>
                </View>
                <Pressable
                  role="button"
                  aria-label={t.certDelete(label)}
                  onPress={() => remove(c.id)}
                  hitSlop={8}
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  <Trash2 size={20} color={colors.danger} />
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
      <ChoiceGroup<CertificationType>
        legend={t.certType}
        value={type}
        options={CERTIFICATION_TYPES.map((value) => ({ value, label: t.certTypes[value] }))}
        onChange={setType}
      />
      {errors.type ? <Notice tone="error">{errors.type}</Notice> : null}
      <ToolField
        label={t.certNumber}
        value={numero}
        onChangeText={setNumero}
        autoCapitalize="characters"
        error={errors.numero}
      />
      <DateTimeFields
        date={dateFin}
        minDate={parisToday()}
        onDate={setDateFin}
        dateLabel={t.certEnd}
        error={errors.dateFin}
      />
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
      <FicheButton
        label={t.certAdd}
        variant="secondary"
        onPress={() => void add()}
        loading={busy}
      />
    </FicheCard>
  );
}

const styles = StyleSheet.create({
  text: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.label },
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: colors.foreground },
  subheading: { fontFamily: font.semibold, fontSize: 14, color: colors["muted-foreground"] },
  list: { gap: spacing(2) },
  specialties: { gap: spacing(2), paddingLeft: spacing(4) },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing(1.5) },
  cert: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    padding: spacing(3),
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
  },
  certText: { flex: 1, gap: 2 },
  certTitle: { fontFamily: font.semibold, fontSize: 15, color: colors.foreground },
  certHint: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  pressed: { opacity: 0.7 },
});

// Réservé selon la place dans l'entreprise (ADR 0241).
export default withTeamPermission("storefront", TradesScreen);
