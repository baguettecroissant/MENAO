import {
  DOCUMENT_HELP,
  DOCUMENT_HELP_VIDEO,
  HELP_VIDEOS,
  STRIPE_CHECKLIST,
  helpVideoUrls,
  type HelpVideoId,
  type RequiredDocumentType,
} from "@menao/core";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  Clock,
  ExternalLink,
  IdCard,
  Info,
  Landmark,
  Mail,
  Play,
  Smartphone,
  type LucideIcon,
} from "lucide-react-native";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { BottomSheet } from "@/components/bottom-sheet";
import { Segmented } from "@/components/segmented";
import { fr } from "@/i18n/fr";
import { env } from "@/lib/env";
import { theme } from "@/ui/theme";
import { CardHeading, FicheButton, FicheCard } from "./fiche-kit";
import { IconSquare } from "./tools-kit";

const t = fr.proHelp;
const { colors, font, radius, spacing } = theme;

/**
 * « Où trouver ce document ? » (lot 60, ADR 0348) : une ligne sous le titre du document qui ouvre
 * une feuille du bas (maquette « AideDocument ») avec le cas à choisir, les étapes, le lien
 * officiel, le message pour l'assureur et « Plus tard ».
 */
export function DocumentHelpButton({ type }: { type: RequiredDocumentType }) {
  const [open, setOpen] = useState(false);
  const help = DOCUMENT_HELP[type];
  return (
    <>
      <Pressable
        role="button"
        aria-label={t.where}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.whereRow, pressed && styles.pressed]}
      >
        <Info size={18} color={colors["primary-strong"]} />
        <Text style={styles.whereText}>{t.where}</Text>
        <ChevronRight size={16} color={colors["primary-strong"]} />
      </Pressable>
      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={help.title}
        closeLabel={t.close}
      >
        <DocumentHelpSteps type={type} onLater={() => setOpen(false)} />
      </BottomSheet>
    </>
  );
}

/**
 * Vidéo verticale de l'aide (ADR 0349) : carte avec l'aperçu, qui ouvre la vidéo dans le navigateur
 * du téléphone (lecteur du système, sans nouvelle dépendance). Fichiers du stockage Supabase.
 */
export function HelpVideoCard({ id }: { id: HelpVideoId }) {
  const { title, seconds } = HELP_VIDEOS[id];
  const urls = helpVideoUrls(env.supabaseUrl, id);
  return (
    <Pressable
      role="button"
      aria-label={`${t.video.label(seconds)}, ${title}`}
      onPress={() => void WebBrowser.openBrowserAsync(urls.video)}
      style={({ pressed }) => [styles.video, pressed && styles.pressed]}
    >
      <View style={styles.videoThumb}>
        <Image source={{ uri: urls.poster }} style={styles.videoPoster} alt="" />
        <View style={styles.videoPlay}>
          <Play size={13} color={colors.foreground} fill={colors.foreground} />
        </View>
      </View>
      <View style={styles.itemTexts}>
        <Text style={styles.videoLabel}>{t.video.label(seconds)}</Text>
        <Text style={styles.itemTitle}>{title}</Text>
        <Text style={styles.itemHint}>{t.video.hint}</Text>
      </View>
      <ChevronRight size={16} color={colors["muted-foreground"]} />
    </Pressable>
  );
}

function DocumentHelpSteps({ type, onLater }: { type: RequiredDocumentType; onLater: () => void }) {
  const help = DOCUMENT_HELP[type];
  const video = DOCUMENT_HELP_VIDEO[type];
  const [index, setIndex] = useState(0);
  const variant = help.variants[index] ?? help.variants[0];
  if (!variant) return null;
  // L'URSSAF ne délivre pas l'attestation à un compte en retard : avertissement plutôt qu'info.
  const warn = type === "urssaf";
  return (
    <View style={styles.steps}>
      {video ? <HelpVideoCard id={video} /> : null}
      {help.variants.length > 1 ? (
        <Segmented
          label={help.title}
          options={help.variants.map((v, i) => ({ value: i, label: v.label ?? "" }))}
          value={index}
          onChange={setIndex}
        />
      ) : null}
      {variant.steps.map((step, i) => (
        <View key={step} style={styles.step}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>{i + 1}</Text>
          </View>
          <Text style={styles.stepText}>{step}</Text>
        </View>
      ))}
      {help.note ? (
        <View style={[styles.note, warn ? styles.noteWarn : styles.noteInfo]}>
          {warn ? (
            <AlertTriangle size={16} color={colors.warning} />
          ) : (
            <Info size={16} color={colors["primary-strong"]} />
          )}
          <Text style={styles.noteText}>{help.note}</Text>
        </View>
      ) : null}
      {variant.link ? (
        <FicheButton
          label={variant.link.label}
          icon={ExternalLink}
          tall
          onPress={() => void Linking.openURL(variant.link?.url ?? "")}
        />
      ) : null}
      {help.insurerRequest ? (
        <FicheButton
          label={t.askInsurer}
          icon={Mail}
          variant="secondary"
          onPress={() => {
            onLater();
            router.push({ pathname: "/pro-assureur", params: { type } });
          }}
        />
      ) : null}
      <FicheButton label={t.later} icon={Clock} variant="secondary" onPress={onLater} />
      <Text style={styles.laterHint}>{t.laterHint}</Text>
    </View>
  );
}

const stripeIcons: LucideIcon[] = [IdCard, Landmark, Smartphone, CalendarDays];

/** « Avant Stripe » (maquette « AideStripe ») : ce que le formulaire demande, avant de l'ouvrir. */
export function StripeChecklist({ withoutIdentity = false }: { withoutIdentity?: boolean }) {
  // Pièce d'identité déjà transmise par MENAO (ADR 0378) : plus besoin de l'avoir sous la main.
  const items = STRIPE_CHECKLIST.map((item, index) => ({
    item,
    icon: stripeIcons[index] ?? IdCard,
  })).slice(withoutIdentity ? 1 : 0);
  return (
    <FicheCard padding={4.5} gap={3}>
      <CardHeading title={t.stripe.title} size={17} />
      <Text style={styles.body}>{t.stripe.intro}</Text>
      {items.map(({ item, icon }) => (
        <View key={item.title} style={styles.item}>
          <IconSquare icon={icon} tone="neutral" size={38} />
          <View style={styles.itemTexts}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemHint}>{item.hint}</Text>
          </View>
        </View>
      ))}
      <HelpVideoCard id="v11-stripe" />
    </FicheCard>
  );
}

const styles = StyleSheet.create({
  video: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    padding: spacing(3),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  videoThumb: {
    width: 54,
    height: 96,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: colors.foreground,
    alignItems: "center",
    justifyContent: "center",
  },
  videoPoster: { position: "absolute", width: 54, height: 96, opacity: 0.8 },
  videoPlay: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  videoLabel: {
    fontFamily: font.bold,
    fontSize: 12,
    letterSpacing: 0.4,
    color: colors["primary-strong"],
  },
  whereRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
    minHeight: theme.touchTarget,
    paddingHorizontal: spacing(3.5),
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  whereText: { flex: 1, fontFamily: font.semibold, fontSize: 15, color: colors["primary-strong"] },
  pressed: { opacity: 0.7 },
  steps: { gap: spacing(3.5) },
  step: { flexDirection: "row", gap: spacing(3), alignItems: "flex-start" },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.foreground,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: { fontFamily: font.bold, fontSize: 14, color: colors.surface },
  stepText: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.foreground,
    paddingTop: 2,
  },
  note: {
    flexDirection: "row",
    gap: spacing(2.5),
    alignItems: "flex-start",
    padding: spacing(3),
    borderRadius: radius.input,
  },
  noteWarn: { backgroundColor: colors["warning-soft"] },
  noteInfo: { backgroundColor: colors["primary-soft"] },
  noteText: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.label,
  },
  laterHint: {
    fontFamily: font.regular,
    fontSize: 13,
    color: colors["muted-foreground"],
    textAlign: "center",
  },
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.label },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    minHeight: theme.touchTarget,
    paddingVertical: spacing(1.5),
  },
  itemTexts: { flex: 1, gap: 2 },
  itemTitle: { fontFamily: font.semibold, fontSize: 15, color: colors.foreground },
  itemHint: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
});
