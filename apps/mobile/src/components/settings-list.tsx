import { router, type Href } from "expo-router";
import { ChevronRight, type LucideIcon } from "lucide-react-native";
import { Children, isValidElement, cloneElement, type ReactElement, type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Switch, Text, View } from "react-native";
import { TAG_TONES, type FicheTone } from "@/components/pro/fiche-kit";
import { haptic } from "@/lib/haptics";
import { Tappable } from "@/ui";
import { theme } from "@/ui/theme";

const { colors, font, radius, spacing } = theme;

export type SettingsTone = "success" | "warning" | "danger" | "neutral";

const TONE: Record<SettingsTone, string> = {
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
  neutral: colors["muted-foreground"],
};

/**
 * Listes groupées des réglages (« Mon compte », ADR 0129), façon iPhone : des lignes dans une même
 * carte, séparées par un filet, avec un titre discret facultatif. `hint` : précision sous la carte.
 * Refonte « Nette » (lot 13, maquette « CompteApp ») : carré d'icône coloré de 34 px, libellé en
 * 16 points, chevron.
 */
export function SettingsSection({
  title,
  hint,
  children,
}: {
  title?: string;
  hint?: string;
  children: ReactNode;
}) {
  // Filet au-dessus de chaque ligne sauf la première.
  const rows = Children.toArray(children)
    .filter(isValidElement)
    .map((child, index) =>
      cloneElement(child as ReactElement<{ first?: boolean }>, { first: index === 0 }),
    );
  return (
    <View style={styles.section}>
      {title ? (
        <Text role="heading" style={styles.title}>
          {title}
        </Text>
      ) : null}
      <View style={styles.group}>{rows}</View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/** Carré d'icône coloré de 34 px des lignes de réglages. */
function RowIcon({ icon: Icon, tone }: { icon: LucideIcon; tone: FicheTone }) {
  const c = TAG_TONES[tone];
  return (
    <View style={[styles.icon, { backgroundColor: c.bg }]}>
      <Icon size={17} color={c.fg} />
    </View>
  );
}

/**
 * Ligne qui ouvre un écran (`href`) ou lance une action (`onPress`), avec sa valeur à droite.
 * `danger` : action à risque (suppression), carré et libellé rouges, sans chevron.
 */
export function SettingsRow({
  icon,
  iconTone = "primary",
  label,
  value,
  tone = "neutral",
  href,
  onPress,
  loading = false,
  danger = false,
  first,
}: {
  icon: LucideIcon;
  /** Couleur du carré d'icône (bleu par défaut). */
  iconTone?: FicheTone;
  label: string;
  value?: string;
  /** Couleur de la valeur à droite. */
  tone?: SettingsTone;
  href?: Href;
  onPress?: () => void;
  loading?: boolean;
  danger?: boolean;
  first?: boolean;
}) {
  return (
    <Tappable
      role={href ? "link" : "button"}
      aria-label={value ? `${label}, ${value}` : label}
      aria-busy={loading}
      disabled={loading}
      onPress={() => (href ? router.push(href) : onPress?.())}
      scaleTo={0.985}
      style={[styles.row, !first && styles.border]}
    >
      <RowIcon icon={icon} tone={danger ? "danger" : iconTone} />
      <Text style={[styles.label, danger && styles.labelDanger]} numberOfLines={2}>
        {label}
      </Text>
      {value ? (
        <Text style={[styles.value, { color: TONE[tone] }]} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : danger ? null : (
        <ChevronRight size={17} color={colors["muted-foreground"]} />
      )}
    </Tappable>
  );
}

/** Ligne avec un interrupteur (préférence enregistrée aussitôt). */
export function SettingsSwitch({
  icon,
  iconTone = "primary",
  label,
  value,
  onChange,
  first,
}: {
  icon: LucideIcon;
  iconTone?: FicheTone;
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  first?: boolean;
}) {
  return (
    <View style={[styles.row, !first && styles.border]}>
      <RowIcon icon={icon} tone={iconTone} />
      <Text style={styles.label} numberOfLines={3}>
        {label}
      </Text>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={(next) => {
          haptic.select();
          onChange(next);
        }}
        trackColor={{ true: colors.primary, false: colors["border-strong"] }}
        thumbColor={colors.surface}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing(2) },
  title: {
    fontFamily: font.semibold,
    fontSize: 13,
    color: colors["muted-foreground"],
    marginLeft: spacing(1),
  },
  group: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  hint: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
    marginHorizontal: spacing(1),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 60,
    paddingHorizontal: 14,
    paddingVertical: spacing(3),
    backgroundColor: colors.surface,
  },
  border: { borderTopWidth: 1, borderTopColor: colors.border },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  label: { flex: 1, fontFamily: font.medium, fontSize: 16, color: colors.foreground },
  labelDanger: { color: colors.danger },
  value: { maxWidth: "45%", fontFamily: font.medium, fontSize: 13 },
});
