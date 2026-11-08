import { CHANTIER_STEPS } from "@menao/core";
import { Check, ChevronLeft, type LucideIcon } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { fr } from "@/i18n/fr";
import { haptic } from "@/lib/haptics";
import { goBack } from "@/lib/navigation";
import type { ScreenPreview } from "@/lib/screen-cache";
import { Skeleton, Tappable } from "@/ui";
import { theme } from "@/ui/theme";

const { colors, font, radius, spacing } = theme;

/**
 * Briques des fiches « Nette » côté artisan (F-92) : fiche d'une demande et fiche d'un chantier,
 * d'après les maquettes validées (« DemandeApp », « ChantierApp ») : barre du haut avec retour,
 * en-tête (puces, grand titre, ligne d'informations), cartes blanches, boutons en pilule, frise
 * des étapes, carte « Prochaine étape », onglets en pilule et barre d'actions fixée en bas.
 */

/** Première lettre en majuscule (« votre client » en début de phrase). */
export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * Écran d'une fiche : barre du haut (retour, titre centré, action facultative à droite), contenu
 * défilant sur le fond crème et barre d'actions facultative fixée en bas (fond blanc, bordure
 * haute, marge du bas du téléphone).
 */
export function FicheScreen({
  title,
  right,
  footer,
  onRefresh,
  children,
}: {
  title: string;
  right?: ReactNode;
  footer?: ReactNode;
  onRefresh?: () => Promise<unknown>;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  async function refresh() {
    if (!onRefresh) return;
    setRefreshing(true);
    haptic.select();
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.bar}>
        <Pressable
          role="button"
          aria-label={fr.nav.back}
          onPress={goBack}
          hitSlop={8}
          style={({ pressed }) => [styles.barButton, pressed && styles.barPressed]}
        >
          <ChevronLeft size={26} color={colors.foreground} strokeWidth={2.2} />
        </Pressable>
        <Text role="heading" style={styles.barTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={[styles.barButton, right ? styles.barRight : null]}>{right}</View>
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: (footer ? 0 : insets.bottom) + spacing(10) },
        ]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
              accessibilityLabel={fr.nav.refreshing}
            />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
      {footer ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing(3) }]}>{footer}</View>
      ) : null}
    </SafeAreaView>
  );
}

/** Fiche en cours de chargement : barre du haut, titre connu de la liste, cartes grises. */
export function FicheSkeleton({ title, preview }: { title: string; preview?: ScreenPreview }) {
  return (
    <FicheScreen title={title}>
      <View role="progressbar" aria-label={fr.nav.loading} aria-busy style={styles.skeleton}>
        {preview ? (
          <Text style={styles.headTitle}>{preview.title}</Text>
        ) : (
          <Skeleton width="75%" height={30} />
        )}
        {preview?.subtitle ? (
          <Text style={styles.headMeta}>{preview.subtitle}</Text>
        ) : (
          <Skeleton width="55%" height={14} />
        )}
        {Array.from({ length: 3 }, (_, i) => (
          <View key={i} style={[styles.card, styles.skeletonCard]}>
            <Skeleton width="45%" height={18} />
            <Skeleton height={14} />
            <Skeleton width="70%" height={14} />
          </View>
        ))}
      </View>
    </FicheScreen>
  );
}

/** En-tête d'une fiche : puces, grand titre (Inter Tight), ligne d'informations. */
export function FicheHead({
  tags,
  title,
  meta,
}: {
  tags: ReactNode;
  title: string;
  meta: string | null;
}) {
  return (
    <View style={styles.head}>
      <View style={styles.tags}>{tags}</View>
      <Text role="heading" aria-level={1} style={styles.headTitle}>
        {title}
      </Text>
      {meta ? <Text style={styles.headMeta}>{meta}</Text> : null}
    </View>
  );
}

export type FicheTone = "primary" | "success" | "warning" | "danger" | "neutral";

/** Couleurs des puces (texte, fond), reprises par les icônes des listes « Nette ». */
export const TAG_TONES: Record<FicheTone, { fg: string; bg: string }> = {
  primary: { fg: colors["primary-strong"], bg: colors["primary-soft"] },
  success: { fg: colors.success, bg: colors["success-soft"] },
  warning: { fg: colors.warning, bg: colors["warning-soft"] },
  danger: { fg: colors.danger, bg: colors["danger-soft"] },
  neutral: { fg: colors.label, bg: "#f1f2f5" },
};

/** Puce carrée des maquettes : métier en gris, état en couleur, point facultatif. */
export function FicheTag({
  text,
  tone,
  dot = false,
}: {
  text: string;
  tone: FicheTone;
  dot?: boolean;
}) {
  const c = TAG_TONES[tone];
  return (
    <View style={[styles.tag, { backgroundColor: c.bg }]}>
      {dot ? <View style={[styles.tagDot, { backgroundColor: c.fg }]} /> : null}
      <Text style={[styles.tagText, { color: c.fg }]}>{text}</Text>
    </View>
  );
}

/** Carte blanche bordée des fiches. */
export function FicheCard({
  children,
  padding = 5,
  gap = 3.5,
}: {
  children: ReactNode;
  /** Marge intérieure, en pas de 4 px. */
  padding?: number;
  gap?: number;
}) {
  return (
    <View style={[styles.card, { padding: spacing(padding), gap: spacing(gap) }]}>{children}</View>
  );
}

/** Titre d'une carte (Inter Tight), avec un lien ou un élément à droite. */
export function CardHeading({
  title,
  size = 18,
  link,
  right,
}: {
  title: string;
  size?: number;
  link?: { label: string; onPress: () => void } | null;
  right?: ReactNode;
}) {
  return (
    <View style={styles.cardHead}>
      <Text
        role="heading"
        style={[styles.cardTitle, { fontSize: size, letterSpacing: -size * 0.02 }]}
      >
        {title}
      </Text>
      {link ? (
        <Pressable role="link" hitSlop={8} onPress={link.onPress}>
          <Text style={styles.cardLink}>{link.label}</Text>
        </Pressable>
      ) : (
        right
      )}
    </View>
  );
}

/** Bouton en pilule des maquettes, icône avant le libellé. */
export function FicheButton({
  label,
  onPress,
  variant = "primary",
  icon: Icon,
  tall = false,
  grow = false,
  loading = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  icon?: LucideIcon;
  /** 50 px (barre d'actions, prochaine étape) au lieu de 44. */
  tall?: boolean;
  /** Partage la largeur de sa rangée avec ses voisins. */
  grow?: boolean;
  loading?: boolean;
  disabled?: boolean;
}) {
  const primary = variant === "primary";
  const fg = primary ? colors["primary-foreground"] : colors.foreground;
  const inactive = disabled || loading;
  return (
    <Tappable
      role="button"
      aria-label={label}
      aria-disabled={inactive}
      aria-busy={loading}
      disabled={inactive}
      onPress={onPress}
      scaleTo={0.98}
      style={[
        styles.button,
        { height: tall ? 50 : 44 },
        primary ? styles.buttonPrimary : styles.buttonSecondary,
        grow && styles.grow,
        grow && styles.buttonTight,
        inactive && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={primary ? colors["primary-foreground"] : colors.primary} />
      ) : (
        <>
          {Icon ? <Icon size={16} color={fg} strokeWidth={2.2} style={styles.icon} /> : null}
          <Text
            numberOfLines={1}
            style={[styles.buttonLabel, { color: fg, fontSize: tall ? 15 : 14 }]}
          >
            {label}
          </Text>
        </>
      )}
    </Tappable>
  );
}

/** Lien discret avec icône (expertise, faux particulier, signalement, annulation). */
export function FicheLink({
  icon: Icon,
  label,
  onPress,
  tone = "muted",
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  tone?: "muted" | "danger";
}) {
  const color = tone === "danger" ? colors.danger : colors["muted-foreground"];
  return (
    <Pressable
      role="link"
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [styles.link, pressed && styles.pressed]}
    >
      <Icon size={16} color={color} style={styles.icon} />
      <Text style={[styles.linkText, { color }]}>{label}</Text>
    </Pressable>
  );
}

/** Ligne « intitulé : valeur » des cartes Planning et Argent. */
export function FicheRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

/** Frise des 5 étapes (spec §9), `current` venant de chantierStepIndex. */
export function FicheStepper({ current }: { current: number }) {
  const n = CHANTIER_STEPS.length;
  return (
    <View style={styles.stepper} aria-label={fr.chantier.stepsLabel}>
      {CHANTIER_STEPS.map((step, i) => {
        const state = i < current ? "done" : i === current ? "now" : "next";
        const leftOn = state !== "next";
        const rightOn = state === "done";
        return (
          <View key={step} style={styles.step}>
            <View style={styles.stepTrack}>
              <View
                style={[
                  styles.stepLine,
                  i === 0 ? styles.transparent : leftOn ? styles.lineOn : styles.lineOff,
                ]}
              />
              <View
                style={[
                  styles.stepDot,
                  state === "done" && styles.dotDone,
                  state === "now" && styles.dotNow,
                  state === "next" && styles.dotNext,
                ]}
              >
                {state === "done" ? (
                  <Check size={15} color={colors["primary-foreground"]} strokeWidth={3} />
                ) : null}
                {state === "now" ? <View style={styles.dotNowInner} /> : null}
              </View>
              <View
                style={[
                  styles.stepLine,
                  i === n - 1 ? styles.transparent : rightOn ? styles.lineOn : styles.lineOff,
                ]}
              />
            </View>
            <View style={styles.stepLabelBox}>
              <Text
                style={[
                  styles.stepLabel,
                  state === "now" && styles.stepLabelNow,
                  state === "next" && styles.stepLabelNext,
                ]}
                numberOfLines={1}
              >
                {fr.chantier.steps[step]}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/**
 * Carte « Prochaine étape » sur fond bleu clair : icône, intitulé, titre, texte, puis l'action
 * principal du moment (`children`), en pleine largeur.
 */
export function NextStepCard({
  icon: Icon,
  title,
  text,
  children,
}: {
  icon: LucideIcon;
  title: string;
  text?: string | null;
  children?: ReactNode;
}) {
  return (
    <View style={styles.next}>
      <View style={styles.nextHead}>
        <View style={styles.nextIcon}>
          <Icon size={20} color={colors["primary-strong"]} />
        </View>
        <View style={styles.nextText}>
          <Text style={styles.nextEyebrow}>{fr.proChantierFiche.nextStep.toUpperCase()}</Text>
          <Text role="heading" style={styles.nextTitle}>
            {title}
          </Text>
          {text ? <Text style={styles.nextBody}>{text}</Text> : null}
        </View>
      </View>
      {children}
    </View>
  );
}

/** Onglets en pilule pleine largeur : actif en bleu nuit, pastille de non-lus facultative. */
export function PillTabs<V extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: V; label: string; badge?: number }[];
  value: V;
  onChange: (value: V) => void;
}) {
  return (
    <View role="tablist" aria-label={label} style={styles.tabs}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            role="tab"
            aria-selected={on}
            aria-label={o.badge ? `${o.label}, ${fr.messages.card.unread(o.badge)}` : o.label}
            onPress={() => {
              if (!on) haptic.select();
              onChange(o.value);
            }}
            style={[styles.tab, on && styles.tabOn]}
          >
            <Text style={[styles.tabText, on && styles.tabTextOn]}>{o.label}</Text>
            {o.badge ? (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{o.badge > 9 ? "9+" : o.badge}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1),
    paddingHorizontal: spacing(2),
    paddingTop: spacing(1),
    paddingBottom: spacing(1.5),
  },
  barButton: {
    width: theme.touchTarget,
    height: theme.touchTarget,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  // Action de droite plus large qu'une icône (« Enregistré » de l'éditeur de devis).
  barRight: { width: "auto", minWidth: theme.touchTarget, paddingHorizontal: spacing(2) },
  barPressed: { backgroundColor: colors["primary-soft"] },
  barTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: font.semibold,
    fontSize: 17,
    color: colors.foreground,
  },
  content: { paddingHorizontal: spacing(4), paddingTop: spacing(1.5), gap: spacing(4) },
  footer: {
    flexDirection: "column",
    gap: spacing(2.5),
    paddingHorizontal: spacing(4),
    paddingTop: spacing(3),
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  skeleton: { gap: spacing(4) },
  skeletonCard: { padding: spacing(5), gap: spacing(3) },
  head: { gap: spacing(2) },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  headTitle: {
    fontFamily: font.display,
    fontSize: 30,
    lineHeight: 33,
    letterSpacing: -0.8,
    color: colors.foreground,
  },
  headMeta: { fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: colors.label },
  tag: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.5),
    borderRadius: radius.chip,
    paddingHorizontal: 9,
    paddingVertical: spacing(1),
  },
  tagDot: { width: 6, height: 6, borderRadius: 3 },
  tagText: { fontFamily: font.bold, fontSize: 12 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: spacing(3),
  },
  cardTitle: { flexShrink: 1, fontFamily: font.display, color: colors.foreground },
  cardLink: { fontFamily: font.semibold, fontSize: 14, color: colors["primary-strong"] },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing(2),
    paddingHorizontal: spacing(4),
    borderRadius: radius.button,
  },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors["border-strong"],
  },
  buttonLabel: { flexShrink: 1, fontFamily: font.semibold },
  // Les icônes ne rétrécissent pas quand le libellé est long (version web).
  icon: { flexShrink: 0 },
  grow: { flexGrow: 1, flexBasis: 0 },
  // Boutons qui partagent une rangée (Message / Appeler / Itinéraire) : marges réduites.
  buttonTight: { paddingHorizontal: spacing(2.5), gap: spacing(1.5) },
  disabled: { opacity: 0.5 },
  link: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
    minHeight: 32,
  },
  linkText: { flexShrink: 1, fontFamily: font.semibold, fontSize: 14 },
  pressed: { opacity: 0.7 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing(3),
    paddingVertical: spacing(2),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowLabel: { fontFamily: font.regular, fontSize: 14, color: colors["muted-foreground"] },
  rowValue: {
    flexShrink: 1,
    textAlign: "right",
    fontFamily: font.semibold,
    fontSize: 14,
    color: colors.foreground,
  },
  stepper: { flexDirection: "row", alignItems: "flex-start" },
  step: { flex: 1, minWidth: 0, alignItems: "center", gap: spacing(2) },
  stepTrack: { alignSelf: "stretch", flexDirection: "row", alignItems: "center" },
  stepLine: { flex: 1, height: 3 },
  transparent: { backgroundColor: "transparent" },
  lineOn: { backgroundColor: colors.primary },
  lineOff: { backgroundColor: colors["border-strong"] },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  dotDone: { backgroundColor: colors.primary },
  dotNow: { borderWidth: 3, borderColor: colors.primary },
  dotNext: { borderWidth: 2, borderColor: colors["border-strong"] },
  dotNowInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  // Libellé un peu plus large que sa colonne (« Planification ») : il déborde sur les marges.
  stepLabelBox: { width: 84, alignItems: "center" },
  stepLabel: {
    textAlign: "center",
    fontFamily: font.semibold,
    fontSize: 12,
    lineHeight: 14,
    color: colors.foreground,
  },
  stepLabelNow: { fontFamily: font.bold },
  stepLabelNext: { color: colors["muted-foreground"] },
  next: {
    gap: spacing(3.5),
    borderRadius: radius.card,
    backgroundColor: colors["primary-soft"],
    padding: spacing(4.5),
  },
  nextHead: { flexDirection: "row", alignItems: "flex-start", gap: spacing(3) },
  nextIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  nextText: { flex: 1, gap: 2 },
  nextEyebrow: {
    fontFamily: font.bold,
    fontSize: 13,
    letterSpacing: 0.5,
    color: colors["primary-strong"],
  },
  nextTitle: { fontFamily: font.semibold, fontSize: 16, lineHeight: 22, color: colors.foreground },
  nextBody: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.label },
  tabs: {
    flexDirection: "row",
    gap: spacing(1),
    padding: spacing(1),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing(1.5),
    height: 40,
    borderRadius: 20,
  },
  tabOn: { backgroundColor: colors.foreground },
  tabText: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  tabTextOn: { fontFamily: font.semibold, color: colors["primary-foreground"] },
  tabBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  tabBadgeText: { fontFamily: font.bold, fontSize: 11, color: colors["primary-foreground"] },
});
