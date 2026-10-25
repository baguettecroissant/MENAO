import { router, useFocusEffect } from "expo-router";
import { Bell, MessageCircle, UserRound } from "lucide-react-native";
import { useCallback, type ReactNode } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { useProfileSummary } from "@/lib/profile-summary";
import { useSession } from "@/lib/session";
import { useUnread } from "@/lib/unread";
import { theme } from "@/ui/theme";

const { colors, font, radius, spacing } = theme;

/**
 * En-tête des onglets, comme les maquettes (« Dashboard », « Mes chantiers », « Devis ») : grand
 * titre et sous-titre, cloche des notifications avec sa pastille, photo du compte qui ouvre
 * « Mon compte ». Artisan : les messages, qui n'ont plus d'onglet (ADR 0188), avec leur pastille.
 * `children` : contenu sous le sous-titre (compteurs, lien).
 */
export function TabHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  const { notifications, messages, refresh } = useUnread();
  const { space } = useSession();
  const profile = useProfileSummary();
  // Retour sur l'onglet : pastille de la cloche à jour.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );
  return (
    <View style={styles.header}>
      <View style={styles.top}>
        <View style={styles.texts}>
          <Text role="heading" style={styles.title}>
            {title}
          </Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {space === "artisan" ? (
          <Pressable
            role="link"
            aria-label={
              messages > 0
                ? `${fr.tabs.messages}, ${fr.messages.unread(messages)}`
                : fr.tabs.messages
            }
            onPress={() => router.push("/pro-messages")}
            style={({ pressed }) => [styles.bell, pressed && styles.pressed]}
          >
            <MessageCircle size={22} color={colors.primary} />
            {messages > 0 ? (
              <View style={[styles.badge, styles.messagesBadge]}>
                <Text style={styles.badgeText}>{messages > 9 ? "9+" : messages}</Text>
              </View>
            ) : null}
          </Pressable>
        ) : null}
        <Pressable
          role="button"
          aria-label={fr.notificationCenter.bell(notifications)}
          onPress={() => router.push("/notifications")}
          style={({ pressed }) => [styles.bell, pressed && styles.pressed]}
        >
          <Bell size={22} color={colors.primary} />
          {notifications > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{notifications > 9 ? "9+" : notifications}</Text>
            </View>
          ) : null}
        </Pressable>
        <Pressable
          role="link"
          aria-label={fr.account.title}
          onPress={() => router.push("/compte")}
          style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
        >
          {profile?.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} alt="" />
          ) : profile?.initials ? (
            <Text style={styles.initial}>{profile.initials}</Text>
          ) : (
            <UserRound size={22} color={colors["primary-foreground"]} />
          )}
        </Pressable>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing(2.5) },
  top: { flexDirection: "row", alignItems: "center", gap: spacing(3) },
  texts: { flex: 1, gap: spacing(1) },
  title: { fontFamily: font.medium, fontSize: 30, lineHeight: 36, color: colors.foreground },
  subtitle: { fontFamily: font.regular, fontSize: 15, color: colors["muted-foreground"] },
  pressed: { opacity: 0.85 },
  bell: {
    width: theme.touchTarget,
    height: theme.touchTarget,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  messagesBadge: { backgroundColor: colors.primary },
  badgeText: { fontFamily: font.bold, fontSize: 10, color: colors["primary-foreground"] },
  // Pastille bleue pleine de la maquette (« NS ») quand il n'y a pas de photo.
  avatar: {
    width: 48,
    height: 48,
    overflow: "hidden",
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: { width: 48, height: 48 },
  initial: { fontFamily: font.bold, fontSize: 18, color: colors["primary-foreground"] },
});
