import { router, type Href } from "expo-router";
import { Check, ChevronRight, Circle, Lock, Sparkles, type LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { haptic } from "@/lib/haptics";
import { Tappable } from "@/ui";
import { theme } from "@/ui/theme";
import { FicheTag, type FicheTone } from "./fiche-kit";
import { IconSquare } from "./tools-kit";

const { colors, font, radius, spacing } = theme;

/**
 * Briques de l'inscription et du dossier de l'artisan (refonte « Nette », lot 9), d'après les
 * maquettes validées (« DossierApp », « DocumentDossierApp », « MetiersMobile », versions
 * ordinateur transposées) : grand titre, groupes en cartes avec compteur, lignes d'élément
 * (carré d'icône, pastille d'état, chevron), barre d'étapes segmentée, métiers en pastilles,
 * bandeau de lecture automatique et mention de confidentialité.
 */

/** État d'un élément du dossier : à faire (bleu clair), déposé (orange), fait (vert), refusé. */
export type DossierTone = "todo" | "pending" | "done" | "danger";

const TONES: Record<DossierTone, FicheTone> = {
  todo: "primary",
  pending: "warning",
  done: "success",
  danger: "danger",
};

/** Grand titre (Inter Tight) et phrase d'introduction des écrans du dossier et de l'inscription. */
export function PageHead({ title, lead }: { title: string; lead?: string | null }) {
  return (
    <View style={styles.head}>
      <Text role="heading" aria-level={1} style={styles.headTitle}>
        {title}
      </Text>
      {lead ? <Text style={styles.headLead}>{lead}</Text> : null}
    </View>
  );
}

/** Groupe du dossier : carte blanche, titre et compteur (« 3 sur 5 »), puis ses lignes. */
export function DossierGroup({
  title,
  count,
  children,
}: {
  title: string;
  count: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.group}>
      <View style={styles.groupHead}>
        <Text role="heading" style={styles.groupTitle}>
          {title}
        </Text>
        <Text style={styles.groupCount}>{count}</Text>
      </View>
      {children}
    </View>
  );
}

/**
 * Ligne d'un groupe : carré d'icône (vert une fois fait), titre, aide, pastille d'état et chevron.
 * `sub` : contenu sous l'aide (entreprise, métiers et zone cochés).
 */
export function DossierRow({
  icon,
  title,
  hint,
  sub,
  status,
  tone,
  href,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  sub?: ReactNode;
  status: string;
  tone: DossierTone;
  href?: Href;
}) {
  const content = (
    <>
      <IconSquare icon={icon} tone={tone === "done" ? "success" : "neutral"} />
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
        {sub}
      </View>
      {/* Pastille centrée sur la ligne, comme la maquette. */}
      <View>
        <FicheTag text={status} tone={TONES[tone]} />
      </View>
      {href ? <ChevronRight size={18} color={colors["muted-foreground"]} /> : null}
    </>
  );
  if (!href) return <View style={styles.row}>{content}</View>;
  return (
    <Tappable
      role="link"
      aria-label={`${title}, ${status}`}
      onPress={() => router.push(href)}
      style={styles.row}
    >
      {content}
    </Tappable>
  );
}

/** Sous-éléments cochés d'une ligne (« ✓ Entreprise ✓ Métiers ✓ Zone »). */
export function DossierChecks({ items }: { items: { label: string; done: boolean }[] }) {
  return (
    <View style={styles.checks}>
      {items.map((item) => (
        <View key={item.label} style={styles.checkItem}>
          {item.done ? (
            <Check size={13} color={colors.success} strokeWidth={2.6} />
          ) : (
            <Circle size={11} color={colors["muted-foreground"]} strokeWidth={2.4} />
          )}
          <Text style={[styles.checkText, !item.done && styles.checkTextTodo]}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

/** Mention de confidentialité des documents, avec le cadenas. */
export function PrivacyNote({ text }: { text: string }) {
  return (
    <View style={styles.privacy}>
      <Lock size={15} color={colors["muted-foreground"]} />
      <Text style={styles.privacyText}>{text}</Text>
    </View>
  );
}

/**
 * Bandeau bleu clair avec un carré d'icône bleu nuit (lecture automatique, demande de la zone) :
 * titre facultatif en gras, texte, puis `children` (lignes supplémentaires).
 */
export function SoftBanner({
  icon = Sparkles,
  title,
  text,
  children,
}: {
  icon?: LucideIcon;
  title?: string;
  text?: string;
  children?: ReactNode;
}) {
  return (
    <View style={[styles.banner, title ? styles.bannerTop : null]}>
      <IconSquare icon={icon} tone="dark" size={title ? 36 : 32} />
      <View style={styles.bannerBody}>
        {title ? <Text style={styles.bannerTitle}>{title}</Text> : null}
        {text ? <Text style={styles.bannerText}>{text}</Text> : null}
        {children}
      </View>
    </View>
  );
}

/** Barre d'étapes segmentée de l'inscription : intitulé, « Étape N sur 4 », segments bleu nuit. */
export function StepsBar({
  label,
  step,
  total,
  text,
}: {
  label: string;
  step: number;
  total: number;
  text: string;
}) {
  return (
    <View style={styles.steps}>
      <View style={styles.stepsRow}>
        <Text style={styles.stepsText}>{label}</Text>
        <Text style={styles.stepsText}>{text}</Text>
      </View>
      <View
        role="progressbar"
        aria-label={label}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={step}
        style={styles.segments}
      >
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={[styles.segment, i < step && styles.segmentOn]} />
        ))}
      </View>
    </View>
  );
}

/** Métier en pastille : choisi en bleu nuit avec une coche. */
export function TradePill({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      role="checkbox"
      aria-checked={selected}
      aria-label={label}
      onPress={() => {
        haptic.select();
        onToggle();
      }}
      style={({ pressed }) => [styles.pill, selected && styles.pillOn, pressed && styles.pressed]}
    >
      {selected ? <Check size={15} color={colors["primary-foreground"]} strokeWidth={2.6} /> : null}
      <Text style={[styles.pillText, selected && styles.pillTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: { gap: spacing(2) },
  headTitle: {
    fontFamily: font.display,
    fontSize: 30,
    lineHeight: 33,
    letterSpacing: -0.9,
    color: colors.foreground,
  },
  headLead: { fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: colors.label },
  group: {
    overflow: "hidden",
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  groupHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: spacing(3),
    paddingHorizontal: 14,
    paddingTop: spacing(4),
    paddingBottom: spacing(2.5),
  },
  groupTitle: {
    flexShrink: 1,
    fontFamily: font.display,
    fontSize: 17,
    letterSpacing: -0.34,
    color: colors.foreground,
  },
  groupCount: { fontFamily: font.semibold, fontSize: 13, color: colors["muted-foreground"] },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    paddingVertical: spacing(3),
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  rowTitle: { fontFamily: font.semibold, fontSize: 15, lineHeight: 20, color: colors.foreground },
  rowHint: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
  checks: { flexDirection: "row", flexWrap: "wrap", columnGap: spacing(3.5), rowGap: 2 },
  checkItem: { flexDirection: "row", alignItems: "center", gap: spacing(1) },
  checkText: { fontFamily: font.semibold, fontSize: 13, color: colors["primary-strong"] },
  checkTextTodo: { color: colors["muted-foreground"] },
  privacy: { flexDirection: "row", alignItems: "flex-start", gap: spacing(2) },
  privacyText: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2.5),
    paddingVertical: spacing(3),
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors["primary-soft"],
  },
  bannerTop: { alignItems: "flex-start", paddingVertical: 14 },
  bannerBody: { flex: 1, gap: spacing(1) },
  bannerTitle: { fontFamily: font.bold, fontSize: 15, lineHeight: 21, color: colors.foreground },
  bannerText: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.label },
  steps: { gap: spacing(2) },
  stepsRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing(3) },
  stepsText: { fontFamily: font.semibold, fontSize: 13, color: colors["muted-foreground"] },
  segments: { flexDirection: "row", gap: 6 },
  segment: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.border },
  segmentOn: { backgroundColor: colors.foreground },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
    maxWidth: "100%",
    paddingHorizontal: spacing(4),
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors["border-strong"],
    backgroundColor: colors.surface,
  },
  pillOn: { borderColor: colors.foreground, backgroundColor: colors.foreground },
  pillText: { flexShrink: 1, fontFamily: font.semibold, fontSize: 15, color: colors.foreground },
  pillTextOn: { color: colors["primary-foreground"] },
  pressed: { opacity: 0.8 },
});
