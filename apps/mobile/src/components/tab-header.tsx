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
  eyebrow,
  children,
}: {
  title: string;
  subtitle?: string;
  /** Petite ligne au-dessus du titre (date du jour de l'accueil, ADR 0245). */
  eyebrow?: string;
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
  const actions = (
    <>
      {space === "artisan" ? (
        <Pressable
          role="link"
          aria-label={
            messages > 0 ? `${fr.tabs.messages}, ${fr.messages.unread(messages)}` : fr.tabs.messages
          }
          onPress={() => router.push("/pro-messages")}
          style={({ pressed }) => [styles.bell, pressed && styles.pressed]}
        >
          <MessageCircle size={20} color={colors.foreground} />
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
        <Bell size={20} color={colors.foreground} />
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
    </>
  );
  const heading = (
    <Text role="heading" style={styles.title}>
      {title}
    </Text>
  );
  // Avec une ligne au-dessus (accueil) : date et boutons sur une ligne, grand titre sur toute la
  // largeur dessous, pour que « Bonjour Prénom » tienne sur une ligne.
  if (eyebrow) {
    return (
      <View style={styles.header}>
        <View style={styles.top}>
          <Text style={[styles.eyebrow, styles.texts]}>{eyebrow}</Text>
          {actions}
        </View>
        <View style={styles.stacked}>
          {heading}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {children}
      </View>
    );
  }
  return (
    <View style={styles.header}>
      <View style={styles.top}>
        <View style={styles.texts}>
          {heading}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {actions}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing(2.5) },
  top: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  texts: { flex: 1, gap: spacing(0.5) },
  stacked: { gap: spacing(1), marginTop: -spacing(1) },
  eyebrow: { fontFamily: font.semibold, fontSize: 14, color: colors["muted-foreground"] },
  title: {
    fontFamily: font.display,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.8,
    color: colors.foreground,
  },
  subtitle: { fontFamily: font.regular, fontSize: 15, color: colors["muted-foreground"] },
  pressed: { opacity: 0.85 },
  bell: {
    width: theme.touchTarget,
    height: theme.touchTarget,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
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
  avatar: {
    width: theme.touchTarget,
    height: theme.touchTarget,
    overflow: "hidden",
    borderRadius: radius.pill,
    backgroundColor: colors.foreground,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: { width: theme.touchTarget, height: theme.touchTarget },
  initial: { fontFamily: font.bold, fontSize: 16, color: colors["primary-foreground"] },
});
