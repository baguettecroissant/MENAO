import {
  DOCUMENT_HELP,
  PREPARE_ITEMS,
  STRIPE_CHECKLIST,
  type PrepareItemKey,
  type RequiredDocumentType,
} from "@menao/core";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  Hash,
  IdCard,
  Info,
  Landmark,
  Mail,
  ShieldCheck,
  Smartphone,
  type LucideIcon,
} from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BottomSheet } from "@/components/bottom-sheet";
import { Segmented } from "@/components/segmented";
import { fr } from "@/i18n/fr";
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

function DocumentHelpSteps({ type, onLater }: { type: RequiredDocumentType; onLater: () => void }) {
  const help = DOCUMENT_HELP[type];
  const [index, setIndex] = useState(0);
  const variant = help.variants[index] ?? help.variants[0];
  if (!variant) return null;
  // L'URSSAF ne délivre pas l'attestation à un compte en retard : avertissement plutôt qu'info.
  const warn = type === "urssaf";
  return (
    <View style={styles.steps}>
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

const prepareIcons: Record<PrepareItemKey, LucideIcon> = {
  siret: Hash,
  decennale: ShieldCheck,
  rc_pro: ShieldCheck,
  urssaf: FileText,
  identite: IdCard,
  rib: Landmark,
};

/**
 * « Avant de commencer » (maquette « AidePreparer ») : les six éléments à préparer, montrés tant
 * qu'aucune pièce n'est déposée. Chaque document ouvre son écran, où se trouve son aide.
 */
export function PrepareCard() {
  return (
    <FicheCard padding={4.5} gap={3}>
      <CardHeading title={t.prepare.title} />
      <Text style={styles.body}>{t.prepare.intro}</Text>
      {PREPARE_ITEMS.map((item) => {
        const document =
          item.key === "siret" || item.key === "rib" ? null : (item.key as RequiredDocumentType);
        const content = (
          <>
            <IconSquare icon={prepareIcons[item.key]} tone="neutral" size={38} />
            <View style={styles.itemTexts}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemHint}>{item.hint}</Text>
            </View>
            {document ? <ChevronRight size={16} color={colors["muted-foreground"]} /> : null}
          </>
        );
        return document ? (
          <Pressable
            key={item.key}
            role="link"
            aria-label={`${item.title}, ${t.where}`}
            onPress={() => router.push({ pathname: "/pro-document", params: { type: document } })}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            {content}
          </Pressable>
        ) : (
          <View key={item.key} style={styles.item}>
            {content}
          </View>
        );
      })}
      <View style={[styles.note, styles.noteInfo]}>
        <Clock size={16} color={colors["primary-strong"]} />
        <Text style={styles.noteText}>{t.prepare.missing}</Text>
      </View>
    </FicheCard>
  );
}

const stripeIcons: LucideIcon[] = [IdCard, Landmark, Smartphone, CalendarDays];

/** « Avant Stripe » (maquette « AideStripe ») : ce que le formulaire demande, avant de l'ouvrir. */
export function StripeChecklist() {
  return (
    <FicheCard padding={4.5} gap={3}>
      <CardHeading title={t.stripe.title} size={17} />
      <Text style={styles.body}>{t.stripe.intro}</Text>
      {STRIPE_CHECKLIST.map((item, index) => (
        <View key={item.title} style={styles.item}>
          <IconSquare icon={stripeIcons[index] ?? IdCard} tone="neutral" size={38} />
          <View style={styles.itemTexts}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemHint}>{item.hint}</Text>
          </View>
        </View>
      ))}
    </FicheCard>
  );
}

const styles = StyleSheet.create({
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
