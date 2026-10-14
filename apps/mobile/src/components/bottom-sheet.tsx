import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/ui/theme";

const { colors, font, radius, spacing } = theme;

/**
 * Feuille qui monte du bas de l'écran (maquettes : « Ajouter à mon agenda », « Ce chantier est-il
 * terminé ? ») : fond assombri qui la ferme, poignée, titre et lien « Fermer ».
 */
export function BottomSheet({
  visible,
  onClose,
  title,
  closeLabel,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Le clavier remonte la feuille (texte de la dictée, par exemple). */}
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable
          role="button"
          aria-label={closeLabel}
          style={styles.backdrop}
          onPress={onClose}
        />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing(4) }]}>
          <View style={styles.handle} />
          <View style={styles.head}>
            <Text role="heading" style={styles.title}>
              {title}
            </Text>
            <Pressable role="button" hitSlop={8} onPress={onClose}>
              <Text style={styles.close}>{closeLabel}</Text>
            </Pressable>
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: `${colors.foreground}66` },
  sheet: {
    gap: spacing(3),
    borderTopLeftRadius: radius.hero,
    borderTopRightRadius: radius.hero,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(5),
    paddingTop: spacing(3),
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors["border-strong"],
    marginBottom: spacing(1),
  },
  head: { flexDirection: "row", alignItems: "center", gap: spacing(3) },
  title: { flex: 1, fontFamily: font.medium, fontSize: 18, color: colors.foreground },
  close: { fontFamily: font.regular, fontSize: 14, color: colors["muted-foreground"] },
});
