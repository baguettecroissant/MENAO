import { Check, CircleAlert, CircleCheck, Info } from "lucide-react-native";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "./theme";

const { colors, radius, font, spacing } = theme;

// Accessibilité : props « role » et « aria-* », comprises à la fois par React Native (iOS, Android)
// et par react-native-web (les anciennes props accessibilityState… ne sont plus lues sur le web).

/** Écran défilant sur le fond crème, dans les marges sûres du téléphone. */
export function Screen({
  children,
  centered = false,
}: {
  children: ReactNode;
  centered?: boolean;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={[styles.screen, centered && styles.centered]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return (
    <Text role="heading" style={styles.title}>
      {children}
    </Text>
  );
}

export function Body({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return <Text style={[styles.body, muted && styles.muted]}>{children}</Text>;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
  disabled?: boolean;
}) {
  const inactive = disabled || loading;
  return (
    <Pressable
      role="button"
      aria-disabled={inactive}
      aria-busy={loading}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        variant === "primary" && styles.buttonPrimary,
        variant === "secondary" && styles.buttonSecondary,
        pressed && styles.pressed,
        inactive && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "primary" ? colors["primary-foreground"] : colors.primary}
        />
      ) : (
        <Text
          style={[
            styles.buttonLabel,
            variant === "primary" ? styles.buttonLabelPrimary : styles.buttonLabelOther,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function TextField({
  label,
  error,
  hint,
  ...input
}: TextInputProps & { label: string; error?: string; hint?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        aria-label={label}
        accessibilityHint={error ?? hint}
        placeholderTextColor={colors["subtle-foreground"]}
        style={[styles.input, error ? styles.inputError : null]}
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
        onPress={() => onChange(!checked)}
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

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
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
  screen: { flexGrow: 1, padding: spacing(5), gap: spacing(4) },
  centered: { justifyContent: "center" },
  title: { fontFamily: font.medium, fontSize: 26, lineHeight: 32, color: colors.foreground },
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.foreground },
  muted: { color: colors["muted-foreground"] },
  button: {
    minHeight: theme.touchTarget + 4,
    borderRadius: radius.button,
    paddingHorizontal: spacing(5),
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors["border-strong"],
  },
  buttonLabel: { fontFamily: font.medium, fontSize: 15 },
  buttonLabelPrimary: { color: colors["primary-foreground"] },
  buttonLabelOther: { color: colors["primary-strong"] },
  pressed: { opacity: 0.85 },
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
  link: { fontFamily: font.medium, fontSize: 15, color: colors["primary-strong"] },
});
