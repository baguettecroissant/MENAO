import {
  CHARTER_RULES,
  CHARTER_RULE_COUNT,
  CHARTER_SECTIONS,
  CHARTER_TEXT,
  CHARTER_VERSION,
  isValidSiret,
  normalizeSiret,
} from "@menao/core";
import { charterAcceptanceSchema } from "@menao/validation";
import { router } from "expo-router";
import { Check } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SignaturePad } from "@/components/pro/signature-pad";
import { fr } from "@/i18n/fr";
import {
  loadCharterState,
  signCharter,
  type CharterAcceptanceRow,
  type CharterState,
} from "@/lib/charter";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Button, Card, Checkbox, Notice, Screen, TextField, Title } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proCharter;
const T = CHARTER_TEXT;
const { colors, font, radius, spacing } = theme;
const PARIS = "Europe/Paris";

/**
 * Charte qualité pour un artisan déjà inscrit (ADR 0109), comme `/pro/charte` sur le site :
 * l'espace artisan (app/pro/_layout.tsx) y renvoie tant que la version en vigueur n'est pas
 * signée. Même texte (packages/core), même contrôle (charterAcceptanceSchema) et même
 * enregistrement (accept_artisan_charter) qu'à l'inscription sur le site (ADR 0104).
 */
export default function CharterScreen() {
  const [state, reload] = useFocusData(loadCharterState);
  if (state === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (state === null) {
    return (
      <Screen>
        <Notice tone="error">{t.error}</Notice>
      </Screen>
    );
  }
  if (state.status === "signee") return <CharterDone acceptance={state.acceptance} />;
  return <CharterForm defaults={state.defaults} onSigned={reload} />;
}

function CharterForm({
  defaults,
  onSigned,
}: {
  defaults: Extract<CharterState, { status: "a_signer" }>["defaults"];
  onSigned: () => void;
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [name, setName] = useState(defaults.name);
  const [company, setCompany] = useState(defaults.company);
  const [siret, setSiret] = useState(defaults.siret);
  const [signature, setSignature] = useState("");
  const [agree, setAgree] = useState(false);
  const [tried, setTried] = useState(false);
  const [invalid, setInvalid] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const done = CHARTER_RULES.filter((r) => checked[r.code]).length;
  // Ce qui manque, en une phrase, comme sur le site ; affiché après un premier essai, et mis à
  // jour à chaque changement.
  const gaps = [
    done < CHARTER_RULE_COUNT ? t.missing.rules(CHARTER_RULE_COUNT - done) : null,
    name.trim().length < 2 ? t.missing.name : null,
    company.trim() ? null : t.missing.company,
    isValidSiret(normalizeSiret(siret)) ? null : t.missing.siret,
    signature ? null : t.missing.signature,
    agree ? null : t.missing.agree,
  ].filter(Boolean);
  const missing = tried && gaps.length > 0 ? `${t.missingPrefix}${gaps.join(", ")}.` : invalid;

  async function submit() {
    setTried(true);
    if (gaps.length > 0) return;
    const parsed = charterAcceptanceSchema.safeParse({
      version: CHARTER_VERSION,
      rules: Object.keys(checked).filter((code) => checked[code]),
      name,
      company,
      siret,
      signature,
      agree,
    });
    if (!parsed.success) return setInvalid(parsed.error.issues[0]?.message ?? fr.errors.generic);
    setInvalid(null);
    setFailure(null);
    setPending(true);
    const error = await signCharter(parsed.data);
    setPending(false);
    if (error) return setFailure(error);
    onSigned();
  }

  return (
    <Screen>
      <Notice tone="info">{t.intro}</Notice>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>{T.eyebrow}</Text>
        <Text role="heading" style={styles.heroTitle}>
          {T.title}
          <Text style={styles.accent}>{T.titleAccent}</Text>
        </Text>
        <Body muted>{T.lead}</Body>
        <Body muted>{T.howTo(CHARTER_RULE_COUNT)}</Body>
      </View>
      {CHARTER_SECTIONS.map((section, si) => (
        <Card key={section.id}>
          <View style={styles.section}>
            <Text role="heading" style={styles.sectionTitle}>
              {`${si + 1}. ${section.title}`}
            </Text>
            <Body muted>{section.why}</Body>
            {section.rules.map((rule, ri) => {
              const code = `R${si + 1}.${ri + 1}`;
              const on = Boolean(checked[code]);
              return (
                <Pressable
                  key={code}
                  role="checkbox"
                  aria-checked={on}
                  aria-label={t.ruleLabel(code, rule.title)}
                  onPress={() => setChecked((prev) => ({ ...prev, [code]: !prev[code] }))}
                  style={[styles.rule, on && styles.ruleOn]}
                >
                  <View style={[styles.box, on && styles.boxOn]}>
                    {on ? (
                      <Check size={14} color={colors["primary-foreground"]} strokeWidth={3} />
                    ) : null}
                  </View>
                  <View style={styles.ruleText}>
                    <Text style={styles.ruleTitle}>
                      <Text style={styles.code}>{code} </Text>
                      {rule.title}
                    </Text>
                    <Text style={styles.ruleBody}>{rule.text}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Card>
      ))}
      <Card>
        <View style={styles.section}>
          <Text role="heading" style={styles.sectionTitle}>
            {T.promisesTitle}
          </Text>
          <Body muted>{T.promisesWhy}</Body>
          {T.promises.map((promise) => (
            <Text key={promise.title} style={styles.ruleBody}>
              <Text style={styles.ruleTitle}>{`${promise.emoji} ${promise.title} : `}</Text>
              {promise.text}
            </Text>
          ))}
        </View>
      </Card>
      <Card>
        <View style={styles.section}>
          <Text role="heading" style={styles.sectionTitle}>
            {T.signatureTitle}
          </Text>
          <Body muted>{T.signatureWhy}</Body>
          <Text style={styles.progress}>{t.progress(done, CHARTER_RULE_COUNT)}</Text>
          <TextField label={t.name} value={name} onChangeText={setName} autoComplete="name" />
          <TextField label={t.company} value={company} onChangeText={setCompany} />
          <TextField
            label={t.siret}
            value={siret}
            onChangeText={setSiret}
            keyboardType="number-pad"
          />
          <Text style={styles.label}>{t.signature}</Text>
          <SignaturePad onChange={setSignature} />
          <Checkbox label={T.agreeTitle} checked={agree} onChange={setAgree} />
          <Body muted>{T.agreeText}</Body>
          {missing ? <Notice tone="error">{missing}</Notice> : null}
          {failure ? <Notice tone="error">{failure}</Notice> : null}
          <Button label={t.submit} onPress={submit} loading={pending} />
        </View>
      </Card>
    </Screen>
  );
}

/** Écran de bienvenue après la signature, avec le récapitulatif, comme sur le site. */
function CharterDone({ acceptance }: { acceptance: CharterAcceptanceRow }) {
  const signedAt = new Date(acceptance.accepted_at);
  const date = signedAt.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: PARIS,
  });
  const time = signedAt.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: PARIS,
  });
  const recap: [string, string][] = [
    [t.recap.company, acceptance.company],
    [t.recap.siret, acceptance.siret],
    [t.recap.signedAt, t.signedOn(date, time)],
    [
      t.recap.rules,
      t.recap.rulesValue(
        CHARTER_RULE_COUNT,
        CHARTER_RULES[0]?.code ?? "",
        CHARTER_RULES.at(-1)?.code ?? "",
      ),
    ],
    [t.recap.level, T.startLevel],
  ];
  return (
    <Screen>
      <View style={styles.done}>
        <View style={styles.badge}>
          <Check size={28} color={colors["primary-foreground"]} strokeWidth={2.6} />
        </View>
        <Text style={styles.eyebrow}>{T.doneEyebrow}</Text>
        <Title center>{T.doneTitle(acceptance.signer_name.split(" ")[0] ?? null)}</Title>
        <Body muted center>
          {T.doneLead}
        </Body>
      </View>
      <Card>
        {recap.map(([label, value], i) => (
          <View key={label} style={[styles.recapRow, i > 0 && styles.recapBorder]}>
            <Text style={styles.recapLabel}>{label}</Text>
            <Text style={styles.recapValue}>{value}</Text>
          </View>
        ))}
      </Card>
      <Button label={t.continue} onPress={() => router.replace("/pro")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  hero: { gap: spacing(2) },
  eyebrow: {
    fontFamily: font.bold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors["primary-strong"],
  },
  heroTitle: { fontFamily: font.bold, fontSize: 24, lineHeight: 30, color: colors.foreground },
  accent: { color: colors.primary },
  section: { gap: spacing(3) },
  sectionTitle: { fontFamily: font.bold, fontSize: 17, color: colors.foreground },
  rule: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing(3),
    borderRadius: radius.input,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing(3),
  },
  ruleOn: { borderColor: colors.primary, backgroundColor: colors["primary-softer"] },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors["border-strong"],
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  boxOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  ruleText: { flex: 1, gap: spacing(1) },
  ruleTitle: { fontFamily: font.medium, fontSize: 15, lineHeight: 21, color: colors.foreground },
  code: { fontFamily: font.bold, color: colors["primary-strong"] },
  ruleBody: {
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors["muted-foreground"],
  },
  progress: { fontFamily: font.medium, fontSize: 14, color: colors["primary-strong"] },
  label: { fontFamily: font.medium, fontSize: 14, color: colors.foreground },
  done: { alignItems: "center", gap: spacing(3), paddingTop: spacing(4) },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  recapRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing(3),
    paddingVertical: spacing(2),
  },
  recapBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  recapLabel: { fontFamily: font.regular, fontSize: 14, color: colors["muted-foreground"] },
  recapValue: {
    flexShrink: 1,
    textAlign: "right",
    fontFamily: font.bold,
    fontSize: 14,
    color: colors.foreground,
  },
});
