import { guideBlocks, nextGuideStep, type RequiredDocumentType } from "@menao/core";
import { router } from "expo-router";
import { Check, Clock, MapPin } from "lucide-react-native";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { PageHead } from "@/components/pro/dossier-kit";
import { CardHeading, FicheButton, FicheCard, FicheTag } from "@/components/pro/fiche-kit";
import { fr } from "@/i18n/fr";
import { loadDossier } from "@/lib/artisan-dossier";
import { loadWelcome } from "@/lib/artisan-signup";
import { dossierGuide, guideHref } from "@/lib/dossier-guide";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice, Screen, ScreenSkeleton } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proSignup.welcome;
const b = t.blocks;
const { colors, font, spacing } = theme;

/** Initiales de l'entreprise pour l'aperçu de la fiche (« Plomberie des Oliviers » → « PO »). */
function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join("") || "M"
  );
}

/**
 * « Votre profil est créé » (ADR 0113), comme sur le site : aperçu de la fiche avec les choix du
 * parcours, puis la suite. Refonte « Nette » (lot 9, maquette « BienvenueNette ») : rond vert,
 * grand titre, aperçu en carte et carte « Dernière étape ». Parcours guidé (ADR 0374) : environ
 * 10 minutes annoncées, trois blocs avec leur durée, et « Commencer » ouvre la première étape.
 */
export default function ArtisanWelcomeScreen() {
  const [data] = useFocusData(loadWelcome);
  const [dossier] = useFocusData(loadDossier);
  if (data === undefined || dossier === undefined) return <ScreenSkeleton />;
  const name = data?.name ?? t.companyFallback;
  const guide = dossier ? dossierGuide(dossier) : null;
  const blocks = guide ? guideBlocks(guide.steps) : null;
  const documentNames = (guide?.steps ?? [])
    .map((step) => b.documentNames[step.key as RequiredDocumentType])
    .filter(Boolean)
    .join(", ");
  const kbisVerified =
    dossier?.documents.some(
      (doc) => doc.type === "kbis" && doc.source === "registre" && doc.status === "valide",
    ) === true;

  /** « Mon dossier » d'abord, pour que le retour y mène, puis la première étape à faire. */
  function start() {
    const first = guide?.active ? nextGuideStep(guide.steps) : null;
    router.replace("/pro");
    if (first) router.push(guideHref(first));
  }
  return (
    <Screen>
      <View style={styles.success}>
        <Check size={28} color={colors["primary-foreground"]} strokeWidth={2.6} />
      </View>
      <PageHead title={t.title} lead={t.lead} />
      {data?.sirene ? <Notice tone="info">{t.sirene[data.sirene]}</Notice> : null}
      <FicheCard padding={5} gap={3.5}>
        <View style={styles.preview}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(name)}</Text>
          </View>
          <View style={styles.previewText}>
            <Text style={styles.name}>{name}</Text>
            {data?.trades.length ? (
              <Text style={styles.muted}>{data.trades.join(" · ")}</Text>
            ) : null}
          </View>
        </View>
        {data?.baseLabel && data.radiusKm ? (
          <View style={styles.line}>
            <MapPin size={16} color={colors.label} />
            <Text style={[styles.zone, styles.flex]}>{t.zone(data.baseLabel, data.radiusKm)}</Text>
          </View>
        ) : null}
        <FicheTag text={t.toVerify} tone="warning" dot />
      </FicheCard>
      <FicheCard padding={5} gap={3.5}>
        <CardHeading title={t.nextTitle} size={19} />
        <View style={styles.line}>
          <Clock size={15} color={colors["primary-strong"]} />
          <Text style={[styles.duration, styles.flex]}>{t.duration}</Text>
        </View>
        {blocks ? (
          <View>
            <Block n={1} title={b.charterTitle} minutes={b.minutes(blocks.charte)}>
              <Text style={styles.blockText}>{b.charterText}</Text>
            </Block>
            <Block
              n={2}
              title={b.documentsTitle(blocks.documents.count)}
              minutes={b.minutes(blocks.documents.minutes)}
            >
              <Text style={styles.blockText}>
                {documentNames.charAt(0).toUpperCase() + documentNames.slice(1)}
              </Text>
              {kbisVerified ? (
                <View style={styles.kbis}>
                  <Check size={14} color={colors.success} strokeWidth={3} />
                  <Text style={[styles.kbisText, styles.flex]}>{b.kbisDone}</Text>
                </View>
              ) : null}
            </Block>
            <Block n={3} title={b.profilTitle} minutes={b.minutes(blocks.profil)}>
              <Text style={styles.blockText}>{b.profilText}</Text>
            </Block>
          </View>
        ) : null}
        <Text style={styles.later}>{t.skipHint}</Text>
        <FicheButton label={t.cta} tall onPress={start} />
        <Text style={styles.later}>{t.later}</Text>
      </FicheCard>
    </Screen>
  );
}

/** Un des trois blocs de la suite : numéro, titre, ce qu'il contient, durée indicative. */
function Block({
  n,
  title,
  minutes,
  children,
}: {
  n: number;
  title: string;
  minutes: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.block}>
      <View style={styles.blockNumber} aria-hidden>
        <Text style={styles.blockNumberText}>{n}</Text>
      </View>
      <View style={styles.flex}>
        <Text style={styles.blockTitle}>{title}</Text>
        {children}
      </View>
      <Text style={styles.blockMinutes}>{minutes}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing(3),
    paddingVertical: spacing(3),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  blockNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.foreground,
    alignItems: "center",
    justifyContent: "center",
  },
  blockNumberText: { fontFamily: font.bold, fontSize: 14, color: colors.surface },
  blockTitle: { fontFamily: font.semibold, fontSize: 15, color: colors.foreground },
  blockText: {
    fontFamily: font.regular,
    fontSize: 13.5,
    lineHeight: 19,
    color: colors["muted-foreground"],
  },
  blockMinutes: {
    fontFamily: font.semibold,
    fontSize: 12.5,
    paddingTop: 2,
    color: colors["muted-foreground"],
  },
  kbis: { flexDirection: "row", alignItems: "center", gap: spacing(1.5), marginTop: spacing(1) },
  kbisText: { fontFamily: font.semibold, fontSize: 13, color: colors.success },
  success: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
  },
  preview: { flexDirection: "row", alignItems: "center", gap: spacing(4) },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: font.bold, fontSize: 22, color: colors["primary-foreground"] },
  previewText: { flex: 1, gap: 2 },
  name: {
    fontFamily: font.display,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.44,
    color: colors.foreground,
  },
  muted: { fontFamily: font.regular, fontSize: 15, color: colors["muted-foreground"] },
  zone: { fontFamily: font.regular, fontSize: 14, color: colors.label },
  flex: { flex: 1 },
  line: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  duration: { fontFamily: font.semibold, fontSize: 14, color: colors["primary-strong"] },
  later: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    color: colors["muted-foreground"],
  },
});
