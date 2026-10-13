import { router, useFocusEffect } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  CreditCard,
  LifeBuoy,
  Search,
  ShieldCheck,
  Star,
} from "lucide-react-native";
import { useCallback } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LogoMark } from "@/components/logo";
import { tradeIcon } from "@/components/trade-icon";
import { fr } from "@/i18n/fr";
import { useSession } from "@/lib/session";
import { useTrades } from "@/lib/trades";
import { Body, Button, Card, IconTile, LinkText, Section } from "@/ui";
import { theme } from "@/ui/theme";

const { colors, font, radius, spacing } = theme;
const TRUST_ICONS = [ShieldCheck, CreditCard, Star, LifeBuoy];
/** Raccourcis par métier affichés sur l'accueil (deux lignes de quatre). */
const SHORTCUTS = 8;

/**
 * Accueil de l'espace client, ouvert à tous sans compte : recherche, raccourcis par métier,
 * fonctionnement et garanties, puis invitation à créer son espace (ADR 0055).
 */
export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { signedIn } = useSession();
  const trades = useTrades();

  // En-tête bleu : barre d'état claire tant que l'accueil est à l'écran.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("light");
      return () => setStatusBarStyle("dark");
    }, []),
  );

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={[styles.hero, { paddingTop: insets.top + spacing(3) }]}>
        <View style={styles.overscroll} />
        <View style={styles.heroTop}>
          <View style={styles.brand}>
            <LogoMark size={28} tone="white" />
            <Text style={styles.brandName}>{fr.brand}</Text>
          </View>
          <Pressable
            role="button"
            aria-label={fr.home.notifications}
            onPress={() => router.push("/notifications")}
            style={({ pressed }) => [styles.roundButton, pressed && styles.pressed]}
          >
            <Bell size={22} color={colors["primary-foreground"]} />
          </Pressable>
        </View>
        <View style={styles.heroText}>
          <Text role="heading" style={styles.greeting}>
            {fr.home.greeting}
          </Text>
          <Text style={styles.subtitle}>{fr.home.subtitle}</Text>
        </View>
        <Pressable
          role="button"
          aria-label={fr.home.searchPlaceholder}
          onPress={() => router.push("/recherche")}
          style={({ pressed }) => [styles.search, pressed && styles.pressed]}
        >
          <Search size={20} color={colors["muted-foreground"]} />
          <Text style={styles.searchText} numberOfLines={1}>
            {fr.home.searchPlaceholder}
          </Text>
          <View style={styles.searchGo}>
            <ArrowRight size={20} color={colors["primary-foreground"]} />
          </View>
        </Pressable>
        <View style={styles.tags}>
          {fr.home.tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <BadgeCheck size={14} color={colors["primary-foreground"]} />
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.body}>
        {trades.length > 0 && (
          <Section title={fr.home.tradesTitle} text={fr.home.tradesText}>
            <View style={styles.trades}>
              {trades.slice(0, SHORTCUTS).map((trade) => {
                const Icon = tradeIcon(trade.code);
                return (
                  <Pressable
                    key={trade.code}
                    role="button"
                    onPress={() =>
                      router.push({ pathname: "/recherche", params: { metier: trade.code } })
                    }
                    style={({ pressed }) => [styles.trade, pressed && styles.pressed]}
                  >
                    <View style={styles.tradeIcon}>
                      <Icon size={24} color={colors.primary} />
                    </View>
                    <Text style={styles.tradeLabel} numberOfLines={1}>
                      {trade.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {trades.length > SHORTCUTS && (
              <LinkText label={fr.home.allTrades} onPress={() => router.push("/recherche")} />
            )}
          </Section>
        )}

        <Section title={fr.home.stepsTitle}>
          <Card>
            {fr.home.steps.map((step, i) => (
              <View key={step.title} style={styles.item}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{i + 1}</Text>
                </View>
                <View style={styles.itemText}>
                  <Text style={styles.itemTitle}>{step.title}</Text>
                  <Body muted>{step.text}</Body>
                </View>
              </View>
            ))}
          </Card>
        </Section>

        <Section title={fr.home.trustTitle}>
          <Card>
            {fr.home.trust.map((item, i) => (
              <View key={item.title} style={styles.item}>
                <IconTile icon={TRUST_ICONS[i] ?? ShieldCheck} size="sm" />
                <View style={styles.itemText}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Body muted>{item.text}</Body>
                </View>
              </View>
            ))}
          </Card>
        </Section>

        {!signedIn && (
          <Card tone="soft">
            <Text style={styles.itemTitle}>{fr.guest.spaceTitle}</Text>
            <Body muted>{fr.guest.spaceText}</Body>
            <Button label={fr.guest.createAccount} onPress={() => router.push("/inscription")} />
            <Button
              label={fr.guest.signIn}
              variant="secondary"
              onPress={() => router.push("/connexion")}
            />
          </Card>
        )}
        <Text style={styles.free}>{fr.home.free}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing(8) },
  hero: {
    backgroundColor: colors.primary,
    borderBottomLeftRadius: radius.hero,
    borderBottomRightRadius: radius.hero,
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(6),
    gap: spacing(5),
  },
  // Bleu au-dessus de l'en-tête quand on tire la page vers le bas (rebond iOS).
  overscroll: {
    position: "absolute",
    top: -1000,
    left: 0,
    right: 0,
    height: 1000,
    backgroundColor: colors.primary,
  },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  brandName: {
    fontFamily: font.bold,
    fontSize: 18,
    letterSpacing: 1,
    color: colors["primary-foreground"],
  },
  roundButton: {
    width: theme.touchTarget,
    height: theme.touchTarget,
    borderRadius: radius.pill,
    backgroundColor: colors["primary-strong"],
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.85 },
  heroText: { gap: spacing(1.5) },
  greeting: {
    fontFamily: font.medium,
    fontSize: 30,
    lineHeight: 36,
    color: colors["primary-foreground"],
  },
  subtitle: {
    fontFamily: font.regular,
    fontSize: 17,
    lineHeight: 24,
    color: colors["primary-foreground"],
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    minHeight: 60,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    paddingLeft: spacing(4),
    paddingRight: spacing(2),
    boxShadow: "0 10px 24px rgba(17, 23, 40, 0.18)",
  },
  searchText: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 16,
    color: colors["muted-foreground"],
  },
  searchGo: {
    width: theme.touchTarget,
    height: theme.touchTarget,
    borderRadius: radius.input,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.5),
    borderRadius: radius.pill,
    backgroundColor: colors["primary-strong"],
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
  },
  tagText: { fontFamily: font.medium, fontSize: 13, color: colors["primary-foreground"] },
  body: { paddingHorizontal: spacing(5), paddingTop: spacing(7), gap: spacing(8) },
  trades: { flexDirection: "row", flexWrap: "wrap", rowGap: spacing(4) },
  trade: { width: "25%", alignItems: "center", gap: spacing(2), paddingHorizontal: spacing(1) },
  tradeIcon: {
    width: 60,
    height: 60,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  tradeLabel: {
    fontFamily: font.medium,
    fontSize: 12,
    color: colors.foreground,
    textAlign: "center",
  },
  item: { flexDirection: "row", alignItems: "flex-start", gap: spacing(3.5) },
  itemText: { flex: 1, gap: spacing(1) },
  itemTitle: { fontFamily: font.medium, fontSize: 16, lineHeight: 22, color: colors.foreground },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors["primary-soft"],
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: { fontFamily: font.bold, fontSize: 15, color: colors["primary-strong"] },
  free: {
    fontFamily: font.medium,
    fontSize: 14,
    color: colors["muted-foreground"],
    textAlign: "center",
  },
});
