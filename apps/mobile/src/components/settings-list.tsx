import { router, type Href } from "expo-router";
import { ChevronRight, type LucideIcon } from "lucide-react-native";
import { Children, isValidElement, cloneElement, type ReactElement, type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Switch, Text, View } from "react-native";
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
 * Listes groupées des réglages (« Mon profil », « Mon compte », ADR 0129) : un titre discret,
 * puis des lignes dans une même carte, séparées par un filet. `hint` : précision sous la carte.
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

/** Ligne qui ouvre un écran (`href`) ou lance une action (`onPress`), avec sa valeur à droite. */
export function SettingsRow({
  icon: Icon,
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
  label: string;
  value?: string;
  tone?: SettingsTone;
  href?: Href;
  onPress?: () => void;
  loading?: boolean;
  /** Action à risque (suppression) : libellé rouge. */
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
      <View style={[styles.icon, danger && styles.iconDanger]}>
        <Icon size={18} color={danger ? colors.danger : colors["primary-strong"]} />
      </View>
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
      ) : (
        <ChevronRight size={18} color={colors["subtle-foreground"]} />
      )}
    </Tappable>
  );
}

/** Ligne avec un interrupteur (préférence enregistrée aussitôt). */
export function SettingsSwitch({
  icon: Icon,
  label,
  value,
  onChange,
  first,
}: {
  icon: LucideIcon;
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  first?: boolean;
}) {
  return (
    <View style={[styles.row, !first && styles.border]}>
      <View style={styles.icon}>
        <Icon size={18} color={colors["primary-strong"]} />
      </View>
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
    fontFamily: font.medium,
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
    gap: spacing(3),
    minHeight: 52,
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(2.5),
    backgroundColor: colors.surface,
  },
  border: { borderTopWidth: 1, borderTopColor: colors.border },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: colors["primary-soft"],
    alignItems: "center",
    justifyContent: "center",
  },
  iconDanger: { backgroundColor: colors["danger-soft"] },
  label: { flex: 1, fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  labelDanger: { color: colors.danger },
  value: { maxWidth: "45%", fontFamily: font.medium, fontSize: 13 },
});
