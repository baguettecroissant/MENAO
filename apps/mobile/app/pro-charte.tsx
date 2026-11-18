import {
  CHARTER_RULES,
  CHARTER_RULE_COUNT,
  CHARTER_SECTIONS,
  CHARTER_TEXT,
  CHARTER_VERSION,
  ENGAGEMENT_DRAFT,
  ENGAGEMENT_TEXT,
  ENGAGEMENT_VERSION,
  isValidSiret,
  normalizeSiret,
} from "@menao/core";
import { charterAcceptanceSchema } from "@menao/validation";
import { router } from "expo-router";
import { ArrowDown, ArrowLeft, Check } from "lucide-react-native";
import { useRef, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type ScrollViewInstance } from "react-native";
import { StepsBar } from "@/components/pro/dossier-kit";
import {
  CardHeading,
  FicheButton,
  FicheCard,
  FicheRow,
  FicheTag,
} from "@/components/pro/fiche-kit";
import { SignaturePad } from "@/components/pro/signature-pad";
import { HelpVideoCard } from "@/components/pro/onboarding-help";
import { CheckRow, ToolField } from "@/components/pro/tools-kit";
import { fr } from "@/i18n/fr";
import { loadDossier } from "@/lib/artisan-dossier";
import { openNextStep } from "@/lib/dossier-guide";
import {
  loadCharterState,
  signCharter,
  type CharterAcceptanceRow,
  type CharterState,
} from "@/lib/charter";
import { useFocusData } from "@/lib/use-focus-data";
import {
  Body,
  Notice,
  Screen,
  ScreenSkeleton,
  Title,
  type ScreenScrollMetrics,
  type ScreenScrollSource,
} from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proCharter;
const T = CHARTER_TEXT;
const { colors, font, radius, spacing } = theme;
const PARIS = "Europe/Paris";

/**
 * Charte qualité pour un artisan déjà inscrit (ADR 0109), comme `/pro/charte` sur le site :
 * l'espace artisan (app/pro/_layout.tsx) y renvoie tant que la version en vigueur n'est pas
 * signée. Même texte (packages/core), même contrôle (charterAcceptanceSchema) et même
 * enregistrement (accept_artisan_charter) qu'à l'inscription sur le site (ADR 0104). Lecture
 * partie par partie (ADR 0374) : neuf écrans, le bouton du bas fait avancer.
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

const PARTS = CHARTER_SECTIONS.length;
// Après les parties de la charte : ce que MENAO promet, l'engagement, la signature.
const PROMISES = PARTS;
const ENGAGEMENT = PARTS + 1;
const SIGNATURE = PARTS + 2;
const SCREENS = PARTS + 3;
const SCREEN_NAMES = [
  ...CHARTER_SECTIONS.map((section) => section.title.split(" :")[0] ?? section.title),
  t.promisesShort,
  t.engagementShort,
  t.signatureShort,
];
/** Marge sous laquelle le bas de l'écran compte comme atteint. */
const END_MARGIN = 32;

/**
 * Charte à lire et signer, une partie par écran comme sur le site (ADR 0373, 0374) : le texte de
 * la charte V5 est inchangé, le bouton du bas fait défiler (« Lire la suite ») puis accepte la
 * partie. Suivent ce que MENAO promet, l'engagement (ADR 0117), puis la signature. Les 25 numéros
 * de règles sont envoyés avec la signature, comme avant.
 */
function CharterForm({
  defaults,
  onSigned,
}: {
  defaults: Extract<CharterState, { status: "a_signer" }>["defaults"];
  onSigned: () => void;
}) {
  const [screen, setScreen] = useState(0);
  // Parties acceptées, dans l'ordre : les règles des `accepted` premières parties.
  const [accepted, setAccepted] = useState(0);
  const [name, setName] = useState(defaults.name);
  const [company, setCompany] = useState(defaults.company);
  const [siret, setSiret] = useState(defaults.siret);
  // Nom, entreprise et SIRET déjà connus : un récapitulatif, « Modifier » rouvre les champs.
  const [editing, setEditing] = useState(
    defaults.name.trim().length < 2 ||
      !defaults.company.trim() ||
      !isValidSiret(normalizeSiret(defaults.siret)),
  );
  const [signature, setSignature] = useState("");
  const [agree, setAgree] = useState(false);
  const [engagement, setEngagement] = useState(false);
  const [tried, setTried] = useState(false);
  const [invalid, setInvalid] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Fin de l'écran atteinte : « Lire la suite » devient le bouton qui accepte.
  const [atEnd, setAtEnd] = useState(false);
  const scroller = useRef<ScrollViewInstance>(null);
  const metrics = useRef<ScreenScrollMetrics>({ offset: 0, viewport: 0, content: 0 });
  // Après un changement d'écran, on attend la hauteur du nouveau contenu avant de juger.
  const armed = useRef(false);

  const reachedEnd = (m: ScreenScrollMetrics) =>
    m.viewport > 0 && m.content > 0 && m.offset + m.viewport >= m.content - END_MARGIN;

  function onMetrics(m: ScreenScrollMetrics, source: ScreenScrollSource) {
    metrics.current = m;
    if (source === "content") armed.current = true;
    if (armed.current && reachedEnd(m)) setAtEnd(true);
  }

  function go(next: number) {
    armed.current = false;
    setAtEnd(false);
    setTried(false);
    // Le tracé ne survit pas au changement d'écran : il sera refait.
    if (screen === SIGNATURE) setSignature("");
    setScreen(next);
    scroller.current?.scrollTo({ y: 0, animated: false });
  }

  const section = CHARTER_SECTIONS[screen];
  const sectionAccepted = screen < accepted;
  const nextName = SCREEN_NAMES[screen + 1];
  const reading = screen <= ENGAGEMENT && !atEnd && !sectionAccepted;

  function advance() {
    if (reading) {
      armed.current = true;
      const m = metrics.current;
      if (reachedEnd(m)) return setAtEnd(true);
      scroller.current?.scrollTo({ y: m.offset + m.viewport * 0.7, animated: true });
      return;
    }
    if (screen < PARTS) setAccepted((n) => Math.max(n, screen + 1));
    if (screen === ENGAGEMENT) setEngagement(true);
    go(screen + 1);
  }

  const rulesLeft = CHARTER_SECTIONS.slice(accepted).flatMap((s) => s.rules).length;
  const identityMissing =
    name.trim().length < 2 || !company.trim() || !isValidSiret(normalizeSiret(siret));
  // Ce qui manque, en une phrase, comme sur le site ; affiché après un premier essai, et mis à
  // jour à chaque changement.
  const gaps = [
    rulesLeft > 0 ? t.missing.rules(rulesLeft) : null,
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
    if (identityMissing) setEditing(true);
    if (gaps.length > 0) return;
    const parsed = charterAcceptanceSchema.safeParse({
      version: CHARTER_VERSION,
      rules: CHARTER_RULES.map((rule) => rule.code),
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
      scroll={{ ref: scroller, onMetrics }}
      footer={
        screen === SIGNATURE ? (
          <>
            {missing ? <Notice tone="error">{missing}</Notice> : null}
            {failure ? <Notice tone="error">{failure}</Notice> : null}
            <FicheButton label={t.submit} tall onPress={() => void submit()} loading={pending} />
          </>
        ) : (
          <>
            {!reading && nextName ? (
              <Text style={styles.footerNote}>{t.nextPart(nextName)}</Text>
            ) : null}
            <FicheButton
              label={
                reading
                  ? t.readMore
                  : screen === ENGAGEMENT
                    ? ENGAGEMENT_TEXT.agreeTitle
                    : section && !sectionAccepted
                      ? t.acceptRules(section.rules.length)
                      : t.continueReading
              }
              variant={reading ? "secondary" : "primary"}
              icon={reading ? ArrowDown : undefined}
              tall
              onPress={advance}
            />
          </>
        )
      }
    >
      <StepsBar
        label={t.part(screen + 1, SCREENS, SCREEN_NAMES[screen] ?? "")}
        step={screen + 1}
        total={SCREENS}
        text=""
      />
      {screen > 0 ? (
        <Pressable role="button" onPress={() => go(screen - 1)} style={styles.previous} hitSlop={8}>
          <ArrowLeft size={16} color={colors["primary-strong"]} />
          <Text style={styles.previousText}>{t.previousPart}</Text>
        </Pressable>
      ) : null}

      {screen === 0 ? (
        <>
          <Notice tone="info">{t.intro}</Notice>
          <HelpVideoCard id="v04-charte" />
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>{T.eyebrow}</Text>
            <Text role="heading" style={styles.heroTitle}>
              {T.title}
              <Text style={styles.accent}>{T.titleAccent}</Text>
            </Text>
            <Text style={styles.lead}>{T.lead}</Text>
            <Text style={styles.lead}>{t.howToParts}</Text>
          </View>
        </>
      ) : null}

      {section ? (
        <FicheCard padding={4.5} gap={2}>
          <CardHeading
            title={`${screen + 1} · ${section.title}`}
            size={17}
            right={sectionAccepted ? <FicheTag text={t.accepted} tone="success" /> : null}
          />
          <Text style={styles.why}>{section.why}</Text>
          <View>
            {section.rules.map((rule, ri) => (
              <View key={rule.title} style={[styles.rule, styles.rulePlain]}>
                <Text style={styles.ruleTitle}>
                  <Text style={styles.code}>{`R${screen + 1}.${ri + 1} · `}</Text>
                  {rule.title}
                </Text>
                <Text style={styles.ruleBody}>{rule.text}</Text>
              </View>
            ))}
          </View>
        </FicheCard>
      ) : null}

      {screen === PROMISES ? (
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
      ) : null}

      {screen === ENGAGEMENT ? <EngagementBlock /> : null}

      {screen === SIGNATURE ? (
        <FicheCard padding={4.5} gap={3.5}>
          <CardHeading title={T.signatureTitle} size={17} />
          <Text style={styles.why}>{T.signatureWhy}</Text>
          {editing ? (
            <>
              <ToolField label={t.name} value={name} onChangeText={setName} autoComplete="name" />
              <ToolField label={t.company} value={company} onChangeText={setCompany} />
              <ToolField
                label={t.siret}
                value={siret}
                onChangeText={setSiret}
                keyboardType="number-pad"
              />
            </>
          ) : (
            <View style={styles.signer} accessible aria-label={t.signer}>
              <View style={styles.signerText}>
                <Text style={styles.ruleTitle}>{name}</Text>
                <Text style={styles.why}>
                  {`${company} · ${t.recap.siret} ${normalizeSiret(siret)}`}
                </Text>
              </View>
              <Pressable role="button" onPress={() => setEditing(true)} hitSlop={10}>
                <Text style={styles.previousText}>{t.edit}</Text>
              </Pressable>
            </View>
          )}
          <Text style={styles.label}>{t.signature}</Text>
          <SignaturePad onChange={setSignature} />
          <CheckRow label={T.agreeTitle} checked={agree} onChange={setAgree} />
          <Text style={styles.why}>{T.agreeText}</Text>
        </FicheCard>
      ) : null}
    </Screen>
  );
}

/** Engagement de l'artisan (ADR 0117), signé avec la charte, comme sur le site. */
function EngagementBlock({ children }: { children?: ReactNode }) {
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
  // Pendant l'inscription, la suite du parcours guidé (ADR 0374) : le premier document.
  const [dossier] = useFocusData(loadDossier);
  const draft = dossier?.status === "brouillon" || dossier?.status === "refuse";
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
      <FicheButton
        label={draft ? t.continueDossier : t.continue}
        tall
        onPress={() =>
          void openNextStep("charte").then((opened) =>
            opened ? undefined : router.replace("/pro"),
          )
        }
      />
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
  rule: { borderTopWidth: 1, borderTopColor: colors.border },
  rulePlain: { paddingVertical: spacing(3) },
  footerNote: {
    fontFamily: font.regular,
    fontSize: 13,
    textAlign: "center",
    color: colors["muted-foreground"],
  },
  previous: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.5),
    alignSelf: "flex-start",
  },
  previousText: { fontFamily: font.semibold, fontSize: 14, color: colors["primary-strong"] },
  signer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    padding: spacing(3.5),
    borderRadius: radius.input,
    backgroundColor: colors.background,
  },
  signerText: { flex: 1, gap: 2 },
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
