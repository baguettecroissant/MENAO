import { Check, CircleCheck, TriangleAlert, type LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { haptic } from "@/lib/haptics";
import { theme } from "@/ui/theme";
import { PageHead } from "./dossier-kit";
import { FicheButton, FicheScreen } from "./fiche-kit";
import { IconSquare } from "./tools-kit";

const { colors, font, spacing } = theme;

/**
 * Briques des écrans d'action de l'artisan (refonte « Nette », lot 10), d'après les maquettes
 * validées (« CreneauxApp », « RefusApp », versions ordinateur transposées) : barre du haut avec
 * retour et titre court, grand titre et phrase d'explication, cartes à cocher ou à choix unique,
 * bandeau d'action définitive, lignes d'alerte et bouton principal collé en bas.
 */

/**
 * Écran d'action : barre du haut (retour, titre court), grand titre (Inter Tight), phrase
 * d'explication, contenus en cartes et bas d'écran fixe (`footer`, bouton principal).
 */
export function ActionScreen({
  bar,
  title,
  lead,
  footer,
  children,
}: {
  bar?: string;
  title: string;
  lead?: string | null;
  footer?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <FicheScreen title={bar} footer={footer}>
      <PageHead title={title} lead={lead} />
      {children}
    </FicheScreen>
  );
}

/**
 * Bouton principal collé en bas : bleu, ou rouge pour refuser ou annuler (`danger`). `note` :
 * ligne au-dessus du bouton (« 3 créneaux seront proposés »), verte quand `noteDone`.
 */
export function ActionSubmit({
  label,
  onPress,
  loading = false,
  disabled = false,
  danger = false,
  variant = "primary",
  note,
  noteDone = false,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  danger?: boolean;
  variant?: "primary" | "secondary";
  note?: string;
  noteDone?: boolean;
}) {
  return (
    <>
      {note ? (
        <Text aria-live="polite" style={[styles.note, noteDone && styles.noteDone]}>
          {note}
        </Text>
      ) : null}
      <FicheButton
        label={label}
        onPress={onPress}
        variant={danger ? "danger" : variant}
        tall
        loading={loading}
        disabled={disabled}
      />
    </>
  );
}

/** Intitulé d'un groupe (« Vos créneaux libres »), avec une précision facultative à droite. */
export function SectionLabel({ text, aside }: { text: string; aside?: string }) {
  return (
    <View style={styles.sectionRow}>
      <Text role="heading" style={styles.section}>
        {text}
      </Text>
      {aside ? <Text style={styles.aside}>{aside}</Text> : null}
    </View>
  );
}

/** Rond de choix des maquettes : bordure bleu nuit épaisse quand il est choisi. */
function RadioDot({ on }: { on: boolean }) {
  return <View style={[styles.dot, on && styles.dotOn]} />;
}

/**
 * Choix unique en cartes (raison du refus, motif d'annulation, échéancier) : rond bleu nuit épais
 * et carte bordée de 2 px bleu nuit quand elle est choisie. `legend` est affichée, sauf
 * `hideLegend` (le grand titre pose déjà la question) : elle reste lue par les lecteurs d'écran.
 */
export function RadioCards<V extends string>({
  legend,
  hideLegend = false,
  options,
  value,
  onChange,
  error,
}: {
  legend: string;
  hideLegend?: boolean;
  options: readonly { value: V; label: string; detail?: string }[];
  value: V | null;
  onChange: (value: V) => void;
  error?: string;
}) {
  return (
    <View style={styles.group}>
      {hideLegend ? null : <SectionLabel text={legend} />}
      <View role="radiogroup" aria-label={legend} style={styles.cards}>
        {options.map((option) => {
          const on = option.value === value;
          return (
            <Pressable
              key={option.value}
              role="radio"
              aria-checked={on}
              aria-label={option.detail ? `${option.label}, ${option.detail}` : option.label}
              onPress={() => {
                if (!on) haptic.select();
                onChange(option.value);
              }}
              style={({ pressed }) => [
                styles.card,
                styles.cardRow,
                on && styles.cardOn,
                pressed && styles.pressed,
              ]}
            >
              <RadioDot on={on} />
              <View style={styles.cardText}>
                <Text style={styles.cardLabel}>{option.label}</Text>
                {option.detail ? <Text style={styles.detail}>{option.detail}</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

/**
 * Créneau à cocher : case bleu nuit, jour à gauche (alerte orange dessous), heure en gros à
 * droite ; carte bordée de 2 px bleu nuit quand il est choisi.
 */
export function SlotCard({
  day,
  time,
  warning,
  checked,
  disabled = false,
  onToggle,
}: {
  day: string;
  time: string;
  warning?: string | null;
  checked: boolean;
  /** Déjà assez de créneaux choisis : la carte ne se coche plus. */
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      role="checkbox"
      aria-checked={checked}
      aria-disabled={disabled}
      aria-label={[day, time, warning].filter(Boolean).join(", ")}
      onPress={() => {
        if (disabled) return;
        haptic.select();
        onToggle();
      }}
      style={({ pressed }) => [
        styles.card,
        styles.cardRow,
        checked && styles.cardOn,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <View style={[styles.box, checked && styles.boxOn]}>
        {checked ? <Check size={13} color={colors["primary-foreground"]} strokeWidth={3} /> : null}
      </View>
      <View style={styles.cardText}>
        <Text style={styles.cardLabel}>{day}</Text>
        {warning ? <Text style={styles.slotWarning}>{warning}</Text> : null}
      </View>
      <Text style={styles.slotTime}>{time}</Text>
    </Pressable>
  );
}

/** Choix unique en pastilles (corps de métier, nature du problème, créneau libre). */
export function ChoicePills<V extends string>({
  label,
  options,
  value,
  onChange,
  error,
}: {
  /** Nom du groupe, lu par les lecteurs d'écran. */
  label: string;
  options: readonly { value: V; label: string }[];
  value: V | null;
  onChange: (value: V) => void;
  error?: string;
}) {
  return (
    <View style={styles.group}>
      <View role="radiogroup" aria-label={label} style={styles.pills}>
        {options.map((option) => {
          const on = option.value === value;
          return (
            <Pressable
              key={option.value}
              role="radio"
              aria-checked={on}
              aria-label={option.label}
              onPress={() => {
                if (!on) haptic.select();
                onChange(option.value);
              }}
              style={({ pressed }) => [styles.pill, on && styles.pillOn, pressed && styles.pressed]}
            >
              <Text style={[styles.pillText, on && styles.pillTextOn]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

/** Bandeau rouge clair d'une action définitive (annulation). */
export function DangerBanner({ text }: { text: string }) {
  return (
    <View style={styles.danger}>
      <Text style={styles.dangerText}>{text}</Text>
    </View>
  );
}

/** Rappel sur fond crème, dans une carte blanche (date prévue au devis). */
export function CreamNote({ children }: { children: ReactNode }) {
  return (
    <View style={styles.cream}>
      <Text style={styles.creamText}>{children}</Text>
    </View>
  );
}

/** Carte de confirmation après l'envoi (expertise, faux particulier) : carré d'icône vert et texte. */
export function SentCard({ text }: { text: string }) {
  return (
    <View role="status" style={styles.sent}>
      <IconSquare icon={CircleCheck} tone="success" size={44} />
      <Text style={styles.sentText}>{text}</Text>
    </View>
  );
}

/** Ligne d'alerte avec icône : orange (agenda) ou verte (rien de prévu, envoi réussi). */
export function AlertLine({
  text,
  tone = "warning",
  icon,
}: {
  text: string;
  tone?: "warning" | "success";
  icon?: LucideIcon;
}) {
  const color = tone === "success" ? colors.success : colors.warning;
  const Icon = icon ?? (tone === "success" ? CircleCheck : TriangleAlert);
  return (
    <View style={styles.alert}>
      <Icon size={16} color={color} style={styles.alertIcon} />
      <Text style={[styles.alertText, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  note: {
    textAlign: "center",
    fontFamily: font.semibold,
    fontSize: 13,
    color: colors["muted-foreground"],
  },
  noteDone: { color: colors.success },
  sectionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
    justifyContent: "space-between",
    columnGap: spacing(3),
    rowGap: 2,
  },
  section: { fontFamily: font.bold, fontSize: 16, color: colors.foreground },
  aside: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  group: { gap: spacing(2.5) },
  cards: { gap: spacing(2.5) },
  card: {
    gap: spacing(3),
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  // Bordure de 2 px : la marge intérieure perd 1 px, la carte garde sa taille.
  cardOn: {
    borderWidth: 2,
    borderColor: colors.foreground,
    paddingVertical: 12,
    paddingHorizontal: 13,
  },
  cardRow: { flexDirection: "row", alignItems: "center", gap: spacing(3) },
  cardText: { flex: 1, minWidth: 0, gap: 2 },
  cardLabel: { fontFamily: font.semibold, fontSize: 15, lineHeight: 21, color: colors.foreground },
  detail: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors["muted-foreground"],
  },
  pressed: { opacity: 0.75 },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors["border-strong"],
    backgroundColor: colors.surface,
    flexShrink: 0,
  },
  dotOn: { borderWidth: 7, borderColor: colors.foreground },
  box: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors["border-strong"],
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  boxOn: { borderColor: colors.foreground, backgroundColor: colors.foreground },
  slotWarning: { fontFamily: font.semibold, fontSize: 13, lineHeight: 18, color: colors.warning },
  slotTime: { fontFamily: font.display, fontSize: 17, color: colors.foreground },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  pill: {
    justifyContent: "center",
    minHeight: 44,
    maxWidth: "100%",
    paddingHorizontal: spacing(4),
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors["border-strong"],
    backgroundColor: colors.surface,
  },
  pillOn: { borderColor: colors.foreground, backgroundColor: colors.foreground },
  pillText: { fontFamily: font.semibold, fontSize: 15, color: colors.foreground },
  pillTextOn: { color: colors["primary-foreground"] },
  error: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: colors.danger },
  danger: {
    borderRadius: 14,
    backgroundColor: colors["danger-soft"],
    paddingVertical: 14,
    paddingHorizontal: spacing(4),
  },
  dangerText: { fontFamily: font.semibold, fontSize: 14, lineHeight: 21, color: colors.danger },
  cream: {
    borderRadius: 14,
    backgroundColor: colors.background,
    paddingVertical: spacing(3),
    paddingHorizontal: 14,
  },
  creamText: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.label },
  sent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    padding: spacing(4),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sentText: {
    flex: 1,
    fontFamily: font.semibold,
    fontSize: 15,
    lineHeight: 21,
    color: colors.foreground,
  },
  alert: { flexDirection: "row", alignItems: "flex-start", gap: spacing(2) },
  alertIcon: { marginTop: 2, flexShrink: 0 },
  alertText: { flex: 1, fontFamily: font.semibold, fontSize: 14, lineHeight: 20 },
});
