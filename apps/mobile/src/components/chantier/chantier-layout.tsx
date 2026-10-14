import { useFocusEffect } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import { ChevronLeft, MapPin, MessageCircle, Phone } from "lucide-react-native";
import { type ReactNode, useCallback } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ChantierCover, ChantierStepper } from "./parts";
import { fr } from "@/i18n/fr";
import { goBack } from "@/lib/navigation";
import { Button } from "@/ui";
import { theme } from "@/ui/theme";

const { colors, font, radius, spacing } = theme;

/**
 * Mise en page commune de la vue d'un chantier, côté client et côté artisan (maquette « Vue d'un
 * chantier ») : grande photo bord à bord avec un retour rond (barre d'état claire), section
 * blanche (titre, adresse, pastilles, description, interlocuteur, « Message » et « Appeler »,
 * étapes), puis le contenu, et un pied d'écran fixe facultatif (action principale de l'artisan).
 */
export function ChantierLayout({
  coverUrl,
  title,
  address,
  pills,
  description,
  personLabel,
  person,
  onMessage,
  phone,
  step,
  identityExtra,
  footer,
  children,
}: {
  coverUrl: string | null;
  title: string;
  address: string | null;
  pills: ReactNode;
  description?: string | null;
  /** « Votre artisan » ou « Votre client », au-dessus de la carte de l'interlocuteur. */
  personLabel: string;
  person: ReactNode;
  onMessage: () => void;
  /** Numéro de l'interlocuteur : bouton « Appeler » seulement s'il est communiqué. */
  phone: string | null;
  step: number | null;
  /** Sous les étapes : chantier clôturé, etc. */
  identityExtra?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  // Photo en haut de l'écran : barre d'état claire tant que la vue est affichée.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("light");
      return () => setStatusBarStyle("dark");
    }, []),
  );

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right"]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: (footer ? 0 : insets.bottom) + spacing(6) }}
      >
        <View>
          <ChantierCover url={coverUrl} height={230} />
          <Pressable
            role="button"
            aria-label={fr.nav.back}
            onPress={goBack}
            hitSlop={8}
            style={({ pressed }) => [
              styles.back,
              { top: insets.top + spacing(2) },
              pressed && styles.pressed,
            ]}
          >
            <ChevronLeft size={22} color={colors.foreground} />
          </Pressable>
        </View>

        <View style={styles.identity}>
          <Text role="heading" style={styles.title}>
            {title}
          </Text>
          {address ? (
            <View style={styles.row}>
              <MapPin size={14} color={colors["muted-foreground"]} />
              <Text style={styles.meta}>{address}</Text>
            </View>
          ) : null}
          <View style={styles.pills}>{pills}</View>
          {description ? <Text style={styles.description}>{description}</Text> : null}
          <Text style={styles.personLabel}>{personLabel}</Text>
          <View style={styles.personCard}>{person}</View>
          <View style={styles.contact}>
            <View style={styles.contactButton}>
              <Button label={fr.messages.button} icon={MessageCircle} onPress={onMessage} />
            </View>
            {phone ? (
              <View style={styles.contactButton}>
                <Button
                  label={fr.chantier.call}
                  variant="secondary"
                  icon={Phone}
                  onPress={() => Linking.openURL(`tel:${phone}`)}
                />
              </View>
            ) : null}
          </View>
          {step !== null ? (
            <View style={styles.stepper}>
              <ChantierStepper current={step} />
            </View>
          ) : null}
          {identityExtra}
        </View>

        <View style={styles.content}>{children}</View>
      </ScrollView>
      {footer ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing(3) }]}>{footer}</View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  pressed: { opacity: 0.85 },
  back: {
    position: "absolute",
    left: spacing(4),
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 8px rgba(17, 23, 40, 0.18)",
  },
  identity: {
    gap: spacing(3),
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(5),
    paddingTop: spacing(5),
    paddingBottom: spacing(5),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontFamily: font.medium, fontSize: 22, lineHeight: 28, color: colors.foreground },
  row: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  meta: {
    flexShrink: 1,
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors["muted-foreground"],
  },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  description: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: colors.foreground },
  personLabel: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
  personCard: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(3.5),
  },
  contact: { flexDirection: "row", gap: spacing(3) },
  contactButton: { flex: 1 },
  stepper: { paddingTop: spacing(2) },
  content: { gap: spacing(4), padding: spacing(5) },
  footer: {
    gap: spacing(3),
    paddingHorizontal: spacing(5),
    paddingTop: spacing(4),
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
