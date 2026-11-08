import {
  CHARTER_RULES,
  CHARTER_RULE_COUNT,
  CHARTER_SECTIONS,
  CHARTER_TEXT,
  CHARTER_VERSION,
  ENGAGEMENT_DRAFT,
  ENGAGEMENT_TEXT,
  ENGAGEMENT_VERSION,
  charterProgress,
  isValidSiret,
  normalizeSiret,
} from "@menao/core";
import { charterAcceptanceSchema } from "@menao/validation";
import { router } from "expo-router";
import { Check } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { CardHeading, FicheButton, FicheCard, FicheRow } from "@/components/pro/fiche-kit";
import { SignaturePad } from "@/components/pro/signature-pad";
import { CheckRow, ProgressBar, ToolField } from "@/components/pro/tools-kit";
import { fr } from "@/i18n/fr";
import {
  loadCharterState,
  signCharter,
  type CharterAcceptanceRow,
  type CharterState,
} from "@/lib/charter";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Notice, Screen, ScreenSkeleton, Title } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proCharter;
const T = CHARTER_TEXT;
const { colors, font, radius, spacing } = theme;
const PARIS = "Europe/Paris";

/**
 * Charte qualité pour un artisan déjà inscrit (ADR 0109), comme `/pro/charte` sur le site :
 * l'espace artisan (app/pro/_layout.tsx) y renvoie tant que la version en vigueur n'est pas
 * signée. Même texte (packages/core), même contrôle (charterAcceptanceSchema) et même
 * enregistrement (accept_artisan_charter) qu'à l'inscription sur le site (ADR 0104). Refonte
 * « Nette » (lot 8, maquette « CharteMobile ») : engagements groupés en cartes avec cases bleu
 * nuit, signature, et barre du bas avec l'avancement et « Signer et rejoindre MENAO ».
 */
export default function CharterScreen() {
  const [state, reload] = useFocusData(loadCharterState);
  if (state === undefined) return <ScreenSkeleton />;
  if (state === null) {
    return (
      <Screen onRefresh={reload}>
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
  const [engagement, setEngagement] = useState(false);
  const [tried, setTried] = useState(false);
  const [invalid, setInvalid] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const progress = charterProgress(checked);
  const done = progress.done;
  // Ce qui manque, en une phrase, comme sur le site ; affiché après un premier essai, et mis à
  // jour à chaque changement.
  const gaps = [
    done < CHARTER_RULE_COUNT ? t.missing.rules(CHARTER_RULE_COUNT - done) : null,
    name.trim().length < 2 ? t.missing.name : null,
    company.trim() ? null : t.missing.company,
    isValidSiret(normalizeSiret(siret)) ? null : t.missing.siret,
    signature ? null : t.missing.signature,
    engagement ? null : t.missing.engagement,
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
      engagementVersion: ENGAGEMENT_VERSION,
      engagement,
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
    <Screen
      footer={
        <>
          {missing ? <Notice tone="error">{missing}</Notice> : null}
          {failure ? <Notice tone="error">{failure}</Notice> : null}
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>{t.engagements(done, progress.total)}</Text>
            <Text style={styles.progressPercent}>{`${progress.percent}\u00a0%`}</Text>
          </View>
          <ProgressBar value={done} target={progress.total} label={t.progressLabel} />
          <FicheButton label={t.submit} tall onPress={() => void submit()} loading={pending} />
        </>
      }
    >
      <Notice tone="info">{t.intro}</Notice>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>{T.eyebrow}</Text>
        <Text role="heading" style={styles.heroTitle}>
          {T.title}
          <Text style={styles.accent}>{T.titleAccent}</Text>
        </Text>
        <Text style={styles.lead}>{T.lead}</Text>
        <Text style={styles.lead}>{T.howTo(CHARTER_RULE_COUNT)}</Text>
      </View>
      {CHARTER_SECTIONS.map((section, si) => {
        const count = progress.sections[si];
        return (
          <FicheCard key={section.id} padding={4.5} gap={2}>
            <CardHeading
              title={`${si + 1} · ${section.title}`}
              size={17}
              right={
                count ? (
                  <Text style={styles.count}>{t.sectionCount(count.done, count.total)}</Text>
                ) : null
              }
            />
            <Text style={styles.why}>{section.why}</Text>
            <View>
              {section.rules.map((rule, ri) => {
                const code = `R${si + 1}.${ri + 1}`;
                return (
                  <View key={code} style={styles.rule}>
                    <CheckRow
                      label={t.ruleLabel(code, rule.title)}
                      checked={Boolean(checked[code])}
                      onChange={(on) => setChecked((prev) => ({ ...prev, [code]: on }))}
                    >
                      <Text style={styles.ruleTitle}>
                        <Text style={styles.code}>{`${code} · `}</Text>
                        {rule.title}
                      </Text>
                      <Text style={styles.ruleBody}>{rule.text}</Text>
                    </CheckRow>
                  </View>
                );
              })}
            </View>
          </FicheCard>
        );
      })}
      <FicheCard padding={4.5} gap={3}>
        <CardHeading title={T.promisesTitle} size={17} />
        <Text style={styles.why}>{T.promisesWhy}</Text>
        {T.promises.map((promise) => (
          <Text key={promise.title} style={styles.ruleBody}>
            <Text style={styles.ruleTitle}>{`${promise.emoji} ${promise.title} : `}</Text>
            {promise.text}
          </Text>
        ))}
      </FicheCard>
      <FicheCard padding={4.5} gap={3.5}>
        <CardHeading title={T.signatureTitle} size={17} />
        <Text style={styles.why}>{T.signatureWhy}</Text>
        <ToolField label={t.name} value={name} onChangeText={setName} autoComplete="name" />
        <ToolField label={t.company} value={company} onChangeText={setCompany} />
        <ToolField
          label={t.siret}
          value={siret}
          onChangeText={setSiret}
          keyboardType="number-pad"
        />
        <EngagementBlock>
          <CheckRow
            label={ENGAGEMENT_TEXT.agreeTitle}
            checked={engagement}
            onChange={setEngagement}
          />
        </EngagementBlock>
        <Text style={styles.label}>{t.signature}</Text>
        <SignaturePad onChange={setSignature} />
        <CheckRow label={T.agreeTitle} checked={agree} onChange={setAgree} />
        <Text style={styles.why}>{T.agreeText}</Text>
      </FicheCard>
    </Screen>
  );
}

/** Engagement de l'artisan (ADR 0117), signé avec la charte, comme sur le site. */
function EngagementBlock({ children }: { children: ReactNode }) {
  const E = ENGAGEMENT_TEXT;
  return (
    <View style={styles.engagement}>
      <Text role="heading" style={styles.ruleTitle}>
        {E.title}
      </Text>
      {ENGAGEMENT_DRAFT ? <Text style={styles.draft}>{E.draft}</Text> : null}
      <Body muted>{E.why}</Body>
      <Text style={styles.ruleTitle}>{E.intro}</Text>
      {E.items.map((item) => (
        <View key={item} style={styles.engagementItem}>
          <Check size={14} color={colors.primary} strokeWidth={3} />
          <Text style={[styles.ruleBody, styles.engagementText]}>{item}</Text>
        </View>
      ))}
      {children}
    </View>
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
    [t.recap.engagement, t.recap.engagementValue(ENGAGEMENT_VERSION)],
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
      <FicheCard gap={0}>
        {recap.map(([label, value]) => (
          <FicheRow key={label} label={label} value={value} />
        ))}
      </FicheCard>
      <FicheButton label={t.continue} tall onPress={() => router.replace("/pro")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing(2) },
  eyebrow: {
    fontFamily: font.bold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors["primary-strong"],
  },
  heroTitle: {
    fontFamily: font.display,
    fontSize: 30,
    lineHeight: 33,
    letterSpacing: -0.9,
    color: colors.foreground,
  },
  accent: { color: colors.primary },
  lead: { fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: colors.label },
  why: {
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors["muted-foreground"],
  },
  count: { fontFamily: font.semibold, fontSize: 13, color: colors["muted-foreground"] },
  rule: { borderTopWidth: 1, borderTopColor: colors.border },
  ruleTitle: { fontFamily: font.semibold, fontSize: 15, lineHeight: 21, color: colors.foreground },
  code: { fontFamily: font.bold, color: colors.foreground },
  ruleBody: {
    marginTop: 2,
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors["muted-foreground"],
  },
  label: { fontFamily: font.semibold, fontSize: 14, color: colors.foreground },
  progressRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing(3) },
  progressText: { fontFamily: font.semibold, fontSize: 13, color: colors.foreground },
  progressPercent: { fontFamily: font.semibold, fontSize: 13, color: colors["muted-foreground"] },
  engagement: {
    gap: spacing(2),
    padding: spacing(3.5),
    borderRadius: radius.input,
    backgroundColor: colors.background,
  },
  draft: {
    alignSelf: "flex-start",
    overflow: "hidden",
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1),
    borderRadius: radius.pill,
    backgroundColor: colors["warning-soft"],
    color: colors.warning,
    fontFamily: font.bold,
    fontSize: 12,
  },
  engagementItem: { flexDirection: "row", alignItems: "flex-start", gap: spacing(2) },
  engagementText: { flex: 1 },
  done: { alignItems: "center", gap: spacing(3), paddingTop: spacing(4) },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
