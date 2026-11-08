import {
  firstOpenSignupStep,
  signupPending,
  signupStepDone,
  type ArtisanSignupDraft,
  type ArtisanSignupStep,
} from "@menao/core";
import { router } from "expo-router";
import { ShieldCheck } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { AccountStep } from "@/components/pro-signup/account-step";
import { CodeStep } from "@/components/pro-signup/code-step";
import { CompanyStep } from "@/components/pro-signup/company-step";
import { Progress } from "@/components/pro-signup/signup-parts";
import { TradesStep } from "@/components/pro-signup/trades-step";
import { ZoneStep } from "@/components/pro-signup/zone-step";
import { FicheButton, FicheTag } from "@/components/pro/fiche-kit";
import { IconSquare } from "@/components/pro/tools-kit";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import {
  clearSignupDraft,
  isSiretRegistered,
  loadProviderName,
  loadSignupDraft,
  saveSignupDraft,
} from "@/lib/artisan-signup";
import { signOut } from "@/lib/auth";
import { goBack } from "@/lib/navigation";
import { useTrades } from "@/lib/trades";
import { useSession } from "@/lib/session";
import { LinkText, Notice, Screen } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proSignup;
const { colors, font, spacing } = theme;

type Step = "intro" | ArtisanSignupStep | "code";
type Identity = { firstName: string; lastName: string };

/**
 * Inscription artisan dans l'application (ADR 0113), comme sur le site (ADR 0110) : une question
 * par écran, bouton principal en bas, choix gardés sur le téléphone. Après Google ou Apple, le
 * compte se finalise ici. Jamais d'abonnement dans l'application (règle 10). Refonte « Nette »
 * (lot 9, maquettes « InscriptionNette », « MetiersMobile ») : barre d'étapes segmentée, grand
 * titre, métiers en pastilles, entreprise trouvée bordée de bleu nuit, bouton collé en bas.
 */
export default function ArtisanSignupScreen() {
  const { session, signedIn, role } = useSession();
  const trades = useTrades();
  const [draft, setDraft] = useState<ArtisanSignupDraft | null>(null);
  const [step, setStep] = useState<Step>("intro");
  const [codeEmail, setCodeEmail] = useState<string | null>(null);
  const [oauth, setOauth] = useState<Identity | null>(null);
  // Entreprise déjà inscrite (ADR 0175) : SIRET déjà rattaché à un compte MENAO.
  const [takenSiret, setTakenSiret] = useState<string | null>(null);
  const siret = draft?.company?.siret ?? null;
  useEffect(() => {
    if (!siret) return;
    let active = true;
    isSiretRegistered(siret)
      .then((registered) => active && setTakenSiret(registered ? siret : null))
      .catch(() => null);
    return () => {
      active = false;
    };
  }, [siret]);
  const siretTaken = siret !== null && takenSiret === siret;
  const pending = signedIn && signupPending(session?.user.app_metadata);
  // Déjà artisan (compte existant retrouvé avec Google ou Apple, par exemple) : son espace.
  const alreadyArtisan =
    signedIn && !pending && (role === "artisan" || role === "artisan_en_attente");

  useEffect(() => {
    if (alreadyArtisan) router.replace("/pro");
  }, [alreadyArtisan]);

  useEffect(() => {
    let active = true;
    loadSignupDraft().then((saved) => {
      if (active) setDraft(saved);
    });
    return () => {
      active = false;
    };
  }, []);

  // Compte Google ou Apple à finaliser (retour du fournisseur, ou réouverture de l'application).
  useEffect(() => {
    if (!pending || !draft || oauth) return;
    let active = true;
    loadProviderName().then((identity) => {
      if (!active) return;
      setOauth(identity);
      setStep(firstOpenSignupStep(draft));
    });
    return () => {
      active = false;
    };
  }, [pending, draft, oauth]);

  if (draft === null || (pending && oauth === null) || alreadyArtisan) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  // Compte client déjà en service : il ne devient pas un compte pro.
  if (signedIn && !pending) {
    return (
      <Screen header={<TopBar />}>
        <Notice tone="info">{t.account.clientAccount}</Notice>
        <LinkText
          label={t.account.notYou}
          onPress={async () => {
            await signOut();
          }}
        />
      </Screen>
    );
  }

  const current = draft;
  const steps: Step[] = oauth
    ? ["metiers", "entreprise", "zone", "compte"]
    : ["metiers", "entreprise", "zone", "compte", "code"];
  const index = steps.indexOf(step);

  function update(patch: Partial<ArtisanSignupDraft>) {
    const next = { ...current, ...patch };
    setDraft(next);
    void saveSignupDraft(next);
  }

  function back() {
    if (step === "intro") return goBack();
    const previous = index > 0 ? steps[index - 1] : oauth ? null : "intro";
    if (previous) setStep(previous);
  }

  async function finish() {
    await clearSignupDraft();
    router.replace("/pro-bienvenue");
  }

  const started = signupStepDone("metiers", current);
  const footer =
    step === "intro" ? (
      <FicheButton
        label={started ? t.intro.resume : t.intro.start}
        tall
        onPress={() => setStep(started ? firstOpenSignupStep(current) : "metiers")}
      />
    ) : step === "metiers" || step === "entreprise" || step === "zone" ? (
      <FicheButton
        tall
        label={
          step === "metiers" && current.tradeCodes.length
            ? t.trades.continue(current.tradeCodes.length)
            : t.continue
        }
        disabled={!signupStepDone(step, current) || (step === "entreprise" && siretTaken)}
        onPress={() => {
          const next = steps[index + 1];
          if (next) setStep(next);
        }}
      />
    ) : undefined;

  return (
    <Screen
      header={<TopBar onBack={oauth && step === "metiers" ? undefined : back} />}
      footer={footer}
    >
      {index >= 0 ? (
        <Progress
          label={t.progressLabel}
          step={index + 1}
          total={steps.length}
          text={t.progress(index + 1, steps.length)}
        />
      ) : null}
      {step === "intro" ? <Intro /> : null}
      {step === "metiers" ? (
        <TradesStep
          trades={trades}
          selected={current.tradeCodes}
          onChange={(tradeCodes) => update({ tradeCodes })}
        />
      ) : null}
      {step === "entreprise" ? (
        <CompanyStep draft={current} update={update} taken={siretTaken} />
      ) : null}
      {step === "zone" ? <ZoneStep draft={current} update={update} /> : null}
      {step === "compte" ? (
        <AccountStep
          draft={current}
          oauth={oauth}
          onCodeSent={(email) => {
            setCodeEmail(email);
            setStep("code");
          }}
          onProfileInvalid={() => setStep(firstOpenSignupStep(current))}
          onDone={finish}
        />
      ) : null}
      {step === "code" && codeEmail ? (
        <CodeStep email={codeEmail} onVerified={finish} onChangeEmail={() => setStep("compte")} />
      ) : null}
    </Screen>
  );
}

function Intro() {
  return (
    <>
      <View style={styles.intro}>
        <FicheTag text={t.intro.eyebrow} tone="primary" />
        <Text role="heading" aria-level={1} style={styles.title}>
          {t.intro.title}
        </Text>
        <Text style={styles.lead}>{t.intro.lead}</Text>
      </View>
      <View style={styles.phases}>
        {t.intro.phases.map((phase, i) => (
          <View key={phase.title} style={styles.phase}>
            <View style={[styles.badge, i === 0 && styles.badgeOn]}>
              <Text style={[styles.badgeText, i === 0 && styles.badgeTextOn]}>{i + 1}</Text>
            </View>
            <View style={styles.phaseText}>
              <Text style={styles.phaseTitle}>{phase.title}</Text>
              <Text style={styles.phaseSub}>{phase.text}</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.trust}>
        <IconSquare icon={ShieldCheck} tone="success" />
        <Text style={styles.trustText}>{t.intro.trust}</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  intro: { gap: spacing(3) },
  title: {
    fontFamily: font.display,
    fontSize: 32,
    lineHeight: 35,
    letterSpacing: -1,
    color: colors.foreground,
  },
  lead: { fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: colors.label },
  phases: { gap: spacing(4.5), paddingVertical: spacing(1) },
  phase: { flexDirection: "row", alignItems: "flex-start", gap: spacing(3.5) },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors["border-strong"],
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeOn: { borderColor: colors.foreground, backgroundColor: colors.foreground },
  badgeText: { fontFamily: font.display, fontSize: 16, color: colors.foreground },
  badgeTextOn: { color: colors["primary-foreground"] },
  phaseText: { flex: 1, gap: 2, paddingTop: 1 },
  phaseTitle: { fontFamily: font.bold, fontSize: 16, lineHeight: 22, color: colors.foreground },
  phaseSub: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.label },
  trust: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    padding: spacing(4),
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  trustText: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.label,
  },
});
