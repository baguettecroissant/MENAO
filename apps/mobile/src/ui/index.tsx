import { Check, CircleAlert, CircleCheck, Info, type LucideIcon } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { fr } from "@/i18n/fr";
import { haptic } from "@/lib/haptics";
import { Skeleton, Tappable } from "./motion";
import { theme } from "./theme";

export { Skeleton, Tappable } from "./motion";
export { toast, ToastHost } from "./toast";

const { colors, radius, font, spacing } = theme;

// Accessibilité : props « role » et « aria-* », comprises à la fois par React Native (iOS, Android)
// et par react-native-web (les anciennes props accessibilityState… ne sont plus lues sur le web).

/**
 * Écran défilant sur le fond crème, dans les marges sûres du téléphone. `header` reste fixé en
 * haut (barre de retour des écrans ouverts par-dessus les onglets) ; `band` le remplace par le
 * bandeau bleu des maquettes, qui couvre aussi la barre d'état.
 */
export function Screen({
  children,
  centered = false,
  header,
  band,
  footer,
  onRefresh,
}: {
  children: ReactNode;
  centered?: boolean;
  header?: ReactNode;
  /** Bandeau bleu en haut de l'écran (`HeaderBand`), bord à bord. */
  band?: ReactNode;
  /** Bas d'écran fixe (bouton d'action principal), au-dessus de la marge du bas du téléphone. */
  footer?: ReactNode;
  /** « Tirer pour actualiser » : recharge les données de l'écran. */
  onRefresh?: () => Promise<unknown>;
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
    <SafeAreaView style={styles.safe} edges={band ? ["left", "right"] : ["top", "left", "right"]}>
      {band}
      {header && !band ? <View style={styles.header}>{header}</View> : null}
      <ScrollView
        contentContainerStyle={[styles.screen, centered && styles.centered]}
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

/**
 * Écran en cours de premier chargement : la forme du contenu en blocs gris qui pulsent, plutôt
 * qu'un rond qui tourne (perçu plus rapide), avec la barre de retour pour pouvoir repartir.
 */
export function ScreenSkeleton({ header, cards = 3 }: { header?: ReactNode; cards?: number }) {
  return (
    <Screen header={header}>
      <View role="progressbar" aria-label={fr.nav.loading} aria-busy style={styles.skeleton}>
        <Skeleton width="60%" height={28} />
        <Skeleton width="85%" height={14} />
        {Array.from({ length: cards }, (_, i) => (
          <View key={i} style={styles.card}>
            <Skeleton width="45%" height={18} />
            <Skeleton height={14} />
            <Skeleton width="70%" height={14} />
          </View>
        ))}
      </View>
    </Screen>
  );
}

export function Title({ children, center = false }: { children: ReactNode; center?: boolean }) {
  return (
    <Text role="heading" style={[styles.title, center && styles.center]}>
      {children}
    </Text>
  );
}

export function Body({
  children,
  muted = false,
  center = false,
}: {
  children: ReactNode;
  muted?: boolean;
  center?: boolean;
}) {
  return (
    <Text style={[styles.body, muted && styles.muted, center && styles.center]}>{children}</Text>
  );
}

/** Titre de section, avec une phrase d'introduction facultative. */
export function Section({
  title,
  text,
  children,
}: {
  title: string;
  text?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text role="heading" style={styles.sectionTitle}>
          {title}
        </Text>
        {text ? <Text style={styles.sectionText}>{text}</Text> : null}
      </View>
      {children}
    </View>
  );
}

/** Icône dans un carré bleu clair aux coins arrondis. */
export function IconTile({
  icon: Icon,
  size = "md",
}: {
  icon: LucideIcon;
  size?: "sm" | "md" | "lg";
}) {
  const box = { sm: 36, md: 44, lg: 64 }[size];
  return (
    <View
      style={[
        styles.iconTile,
        { width: box, height: box, borderRadius: size === "lg" ? radius.card + 4 : 12 },
      ]}
    >
      <Icon size={{ sm: 18, md: 22, lg: 30 }[size]} color={colors.primary} />
    </View>
  );
}

/** Puce sélectionnable (métier, exemple de projet). */
export function Chip({
  label,
  selected = false,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      role="button"
      aria-selected={selected}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  icon: Icon,
}: {
  label: string;
  onPress: () => void;
  /** « danger » : action à risque en texte rouge (refuser, annuler), comme les maquettes. */
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
  disabled?: boolean;
  /** Icône après le libellé (« Message », « Appeler », « Ajouter à mon calendrier »). */
  icon?: LucideIcon;
}) {
  const inactive = disabled || loading;
  const labelColor =
    variant === "primary"
      ? colors["primary-foreground"]
      : variant === "danger"
        ? colors.danger
        : colors["primary-strong"];
  return (
    <Tappable
      role="button"
      aria-disabled={inactive}
      aria-busy={loading}
      onPress={onPress}
      disabled={inactive}
      scaleTo={0.98}
      style={[
        styles.button,
        variant === "primary" && styles.buttonPrimary,
        variant === "secondary" && styles.buttonSecondary,
        inactive && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "primary" ? colors["primary-foreground"] : colors.primary}
        />
      ) : (
        <View style={styles.buttonContent}>
          <Text
            style={[
              styles.buttonLabel,
              variant === "primary"
                ? styles.buttonLabelPrimary
                : variant === "danger"
                  ? styles.buttonLabelDanger
                  : styles.buttonLabelOther,
            ]}
          >
            {label}
          </Text>
          {Icon ? <Icon size={18} color={labelColor} /> : null}
        </View>
      )}
    </Tappable>
  );
}

export function TextField({
  label,
  error,
  hint,
  onFocus,
  onBlur,
  ...input
}: TextInputProps & { label: string; error?: string; hint?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        aria-label={label}
        accessibilityHint={error ?? hint}
        placeholderTextColor={colors["subtle-foreground"]}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          styles.input,
          input.multiline ? styles.inputMultiline : null,
          focused ? styles.inputFocused : null,
          error ? styles.inputError : null,
        ]}
        {...input}
      />
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
  error,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
}) {
  return (
    <View style={styles.field}>
      <Pressable
        role="checkbox"
        aria-checked={checked}
        aria-label={label}
        onPress={() => {
          haptic.select();
          onChange(!checked);
        }}
        style={styles.checkboxRow}
      >
        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
          {checked ? <Check size={14} color={colors["primary-foreground"]} /> : null}
        </View>
        <Text style={styles.checkboxLabel}>{label}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function Notice({
  tone,
  children,
}: {
  tone: "error" | "success" | "info";
  children: ReactNode;
}) {
  const palette = {
    error: { bg: colors["danger-soft"], fg: colors.danger, Icon: CircleAlert },
    success: { bg: colors["success-soft"], fg: colors.success, Icon: CircleCheck },
    info: { bg: colors["primary-soft"], fg: colors["primary-strong"], Icon: Info },
  }[tone];
  return (
    <View
      role={tone === "error" ? "alert" : undefined}
      style={[styles.notice, { backgroundColor: palette.bg }]}
    >
      <palette.Icon size={16} color={palette.fg} />
      <Text style={[styles.noticeText, { color: palette.fg }]}>{children}</Text>
    </View>
  );
}

export function Card({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "soft";
}) {
  return <View style={[styles.card, tone === "soft" && styles.cardSoft]}>{children}</View>;
}

export function LinkText({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable role="link" onPress={onPress} hitSlop={8}>
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing(5), paddingTop: spacing(2) },
  footer: {
    gap: spacing(2),
    paddingHorizontal: spacing(5),
    paddingTop: spacing(3),
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  screen: { flexGrow: 1, padding: spacing(5), gap: spacing(4) },
  centered: { justifyContent: "center" },
  title: { fontFamily: font.medium, fontSize: 26, lineHeight: 32, color: colors.foreground },
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.foreground },
  muted: { color: colors["muted-foreground"] },
  center: { textAlign: "center" },
  section: { gap: spacing(3) },
  sectionHead: { gap: spacing(1) },
  sectionTitle: { fontFamily: font.medium, fontSize: 20, lineHeight: 26, color: colors.foreground },
  sectionText: {
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors["muted-foreground"],
  },
  iconTile: {
    backgroundColor: colors["primary-soft"],
    alignItems: "center",
    justifyContent: "center",
  },
  chip: {
    // Une puce trop longue passe à la ligne au lieu de déborder de l'écran.
    maxWidth: "100%",
    minHeight: 36,
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors["border-strong"],
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(1.5),
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipLabel: { fontFamily: font.medium, fontSize: 14, color: colors.foreground },
  chipLabelSelected: { color: colors["primary-foreground"] },
  button: {
    minHeight: theme.touchTarget + 4,
    borderRadius: radius.button,
    paddingHorizontal: spacing(5),
    alignItems: "center",
    justifyContent: "center",
  },
  buttonContent: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors["border-strong"],
  },
  buttonLabel: { fontFamily: font.medium, fontSize: 15 },
  buttonLabelPrimary: { color: colors["primary-foreground"] },
  buttonLabelDanger: { color: colors.danger },
  buttonLabelOther: { color: colors["primary-strong"] },
  pressed: { opacity: 0.85 },
  skeleton: { gap: spacing(3) },
  disabled: { opacity: 0.5 },
  field: { gap: spacing(1.5) },
  label: { fontFamily: font.medium, fontSize: 14, color: colors.foreground },
  input: {
    minHeight: 48,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(4),
    fontFamily: font.regular,
    fontSize: 15,
    color: colors.foreground,
  },
  inputMultiline: {
    minHeight: 140,
    paddingTop: spacing(3),
    paddingBottom: spacing(3),
    textAlignVertical: "top",
  },
  // Contour du champ actif (remplace celui du navigateur sur la version web).
  inputFocused: { borderColor: colors.primary, outlineWidth: 0 },
  inputError: { borderColor: colors.danger },
  error: { fontFamily: font.regular, fontSize: 13, color: colors.danger },
  hint: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing(3),
    minHeight: theme.touchTarget,
  },
  checkbox: {
    width: 22,
    height: 22,
    marginTop: 1,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors["border-strong"],
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxLabel: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.foreground,
  },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing(2.5),
    borderRadius: radius.input,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
  },
  noticeText: { flex: 1, fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(5),
    gap: spacing(3),
  },
  cardSoft: { backgroundColor: colors["primary-softer"], borderColor: colors["primary-soft"] },
  link: { fontFamily: font.medium, fontSize: 15, color: colors["primary-strong"] },
});
