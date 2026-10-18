import { parisToday, validRgeDomains } from "@menao/core";
import { CERTIFICATION_TYPES, type CertificationType } from "@menao/validation";
import { Trash2 } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { DateTimeFields } from "@/components/date-time-fields";
import { CheckRow, ChoiceGroup } from "@/components/pro-signup/signup-parts";
import { TopBar } from "@/components/top-bar";
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
import { Body, Button, Card, Notice, Screen, TextField, Title } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proTrades;
const { colors, font, radius, spacing } = theme;

type Message = { tone: "error" | "success"; text: string } | null;

/**
 * Métiers, spécialités, expérience, certifications et RGE (ADR 0125), comme l'étape « Métiers »
 * du site : mêmes contrôles, mêmes écritures (set_artisan_trades, certifications, rge-check).
 */
export default function TradesScreen() {
  const [data, reload] = useFocusData(loadTrades);
  if (data === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  return (
    <Screen header={<TopBar />}>
      <Title>{t.title}</Title>
      {data === null ? (
        <Notice tone="error">{t.loadError}</Notice>
      ) : (
        <>
          <TradesCard data={data} onSaved={reload} />
          <RgeCard data={data} onChange={reload} />
          <CertificationsCard data={data} onChange={reload} />
        </>
      )}
    </Screen>
  );
}

function TradesCard({ data, onSaved }: { data: TradesData; onSaved: () => Promise<void> }) {
  const [trades, setTrades] = useState(() => new Set(data.selectedTrades));
  const [workTypes, setWorkTypes] = useState(() => new Set(data.selectedWorkTypes));
  const [experience, setExperience] = useState(
    data.experienceYears === null ? "" : String(data.experienceYears),
  );
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
      allowedWorkTypes: data.trades
        .filter((tr) => trades.has(tr.code))
        .flatMap((tr) => tr.workTypes.map((w) => w.code)),
    });
    setBusy(false);
    setErrors(result.ok ? {} : (result.fields ?? {}));
    if (!result.ok && result.error) setMessage({ tone: "error", text: result.error });
    if (result.ok) {
      setMessage({ tone: "success", text: t.saved });
      await onSaved();
    }
  }

  return (
    <Card>
      <Text role="heading" style={styles.heading}>
        {t.legend}
      </Text>
      <Body muted>{t.hint}</Body>
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
      <TextField
        label={t.experience}
        value={experience}
        onChangeText={setExperience}
        keyboardType="number-pad"
        error={errors.experienceYears}
      />
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
      <Button label={t.save} onPress={save} loading={busy} />
    </Card>
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
    <Card>
      <Text role="heading" style={styles.heading}>
        {t.rgeTitle}
      </Text>
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
      {domains.length > 0 ? (
        <>
          <Body>{t.rgeFound}</Body>
          <View style={styles.tags}>
            {domains.map((domain) => (
              <Text key={domain} style={styles.tag}>
                {domain}
              </Text>
            ))}
          </View>
        </>
      ) : (
        <Body muted>{t.rgeNone}</Body>
      )}
      {data.rgeCheckedAt ? (
        <Body muted>{t.rgeCheckedOn(formatLongDate(data.rgeCheckedAt))}</Body>
      ) : null}
      <Button label={t.rgeRefresh} variant="secondary" onPress={refresh} loading={busy} />
    </Card>
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
    <Card>
      <Text role="heading" style={styles.heading}>
        {t.certifications}
      </Text>
      <Body muted>{t.certificationsHint}</Body>
      {data.certifications.length === 0 ? (
        <Body muted>{t.noCertification}</Body>
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
      <TextField
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
      <Button label={t.certAdd} variant="secondary" onPress={add} loading={busy} />
    </Card>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  heading: { fontFamily: font.bold, fontSize: 17, color: colors.foreground },
  subheading: { fontFamily: font.medium, fontSize: 14, color: colors["muted-foreground"] },
  list: { gap: spacing(2) },
  specialties: { gap: spacing(2), paddingLeft: spacing(4) },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing(1.5) },
  tag: {
    fontFamily: font.medium,
    fontSize: 13,
    color: colors["primary-strong"],
    backgroundColor: colors["primary-softer"],
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1),
    borderRadius: radius.pill,
    overflow: "hidden",
  },
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
  certTitle: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  certHint: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  pressed: { opacity: 0.7 },
});
