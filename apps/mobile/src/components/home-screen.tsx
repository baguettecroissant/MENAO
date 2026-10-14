import type { ClientHomeSummary } from "@menao/core";
import { router, useFocusEffect } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  Clock,
  CreditCard,
  HardHat,
  LifeBuoy,
  MessageCircle,
  Search,
  ShieldCheck,
  Star,
  type LucideIcon,
} from "lucide-react-native";
import { useCallback, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ClientDashboard } from "@/components/client-dashboard";
import { LogoMark } from "@/components/logo";
import { tradeIcon } from "@/components/trade-icon";
import { PushPrompt } from "@/components/push-prompt";
import { fr } from "@/i18n/fr";
import { loadClientHome } from "@/lib/client-home";
import { openTab } from "@/lib/navigation";
import { useSession } from "@/lib/session";
import { useUnread } from "@/lib/unread";
import { useTrades } from "@/lib/trades";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Button, Card, IconTile, LinkText, Notice, Section } from "@/ui";
import { theme } from "@/ui/theme";

const { colors, font, radius, spacing } = theme;
const TRUST_ICONS = [ShieldCheck, CreditCard, Star, LifeBuoy];
/** Raccourcis par métier affichés sur l'accueil (deux lignes de quatre). */
const SHORTCUTS = 8;

const t = fr.home.dashboard;

/**
 * Accueil de l'espace client (ADR 0055), ouvert à tous sans compte : recherche, raccourcis par
 * métier, fonctionnement et garanties, puis invitation à créer son espace. Un client connecté y
 * trouve son tableau de bord (ADR 0082), remis à zéro au changement de compte.
 */
export function HomeScreen() {
  const { signedIn, session } = useSession();
  if (signedIn && session) return <ClientHome key={session.user.id} />;
  return <GuestHome />;
}

function GuestHome() {
  return (
    <HomeFrame title={fr.home.greeting} subtitle={fr.home.subtitle} badges={<Tags />}>
      <TradeShortcuts title={fr.home.tradesTitle} text={fr.home.tradesText} />
      <Steps />
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
      <Text style={styles.free}>{fr.home.free}</Text>
    </HomeFrame>
  );
}

const summaryText = (summary: ClientHomeSummary) => {
  switch (summary.kind) {
    case "actions":
      return t.summary.actions(summary.count);
    case "a_jour":
      return t.summary.a_jour;
    case "demandes":
      return t.summary.demandes(summary.count);
    default:
      return fr.home.subtitle;
  }
};

/**
 * Tableau de bord du client connecté (ADR 0082) : message personnalisé, compteurs, ce qui
 * l'attend, prochains rendez-vous et chantiers en cours. Sans chantier ni demande, l'accueil garde
 * « Comment ça marche ».
 */
function ClientHome() {
  const [home, reload] = useFocusData(loadClientHome);
  const { messages } = useUnread();
  const counters: { icon: LucideIcon; label: string; onPress: () => void }[] = home
    ? [
        ...(home.activeCount > 0
          ? [
              {
                icon: HardHat,
                label: fr.myChantiers.countActive(home.activeCount),
                onPress: () => openTab("/chantiers"),
              },
            ]
          : []),
        ...(home.awaitingRequests > 0
          ? [
              {
                icon: Clock,
                label: t.counts.requests(home.awaitingRequests),
                onPress: () => openTab("/chantiers"),
              },
            ]
          : []),
        ...(messages > 0
          ? [
              {
                icon: MessageCircle,
                label: fr.messages.unread(messages),
                onPress: () => openTab("/messages"),
              },
            ]
          : []),
      ]
    : [];
  const fresh = home?.summary.kind === "accueil" && !home.draft;

  return (
    <HomeFrame
      title={t.hello(home?.firstName ?? null)}
      subtitle={home ? summaryText(home.summary) : fr.home.subtitle}
      badges={
        counters.length > 0 ? (
          <View style={styles.tags}>
            {counters.map(({ icon: Icon, label, onPress }) => (
              <Pressable
                key={label}
                role="link"
                onPress={onPress}
                style={({ pressed }) => [styles.tag, pressed && styles.pressed]}
              >
                <Icon size={14} color={colors["primary-foreground"]} />
                <Text style={styles.tagText}>{label}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Tags />
        )
      }
      onRefresh={reload}
    >
      <PushPrompt />
      {home === undefined ? (
        <ActivityIndicator color={colors.primary} />
      ) : home === null ? (
        <Notice tone="error">{t.error}</Notice>
      ) : (
        <ClientDashboard home={home} />
      )}
      {fresh ? (
        <>
          <TradeShortcuts title={fr.home.tradesTitle} text={fr.home.tradesText} />
          <Steps />
        </>
      ) : (
        <TradeShortcuts title={t.newProjectTitle} text={t.newProjectText} />
      )}
    </HomeFrame>
  );
}

/**
 * En-tête bleu de l'accueil (marque, cloche, message, recherche, puces) puis le contenu. Tirer
 * vers le bas relit les données (`onRefresh`) et les compteurs de la cloche.
 */
function HomeFrame({
  title,
  subtitle,
  badges,
  onRefresh,
  children,
}: {
  title: string;
  subtitle: string;
  badges: ReactNode;
  onRefresh?: () => Promise<void>;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { notifications, refresh } = useUnread();
  const [refreshing, setRefreshing] = useState(false);

  // En-tête bleu : barre d'état claire tant que l'accueil est à l'écran.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("light");
      // Retour sur l'accueil : pastille de la cloche à jour.
      refresh();
      return () => setStatusBarStyle("dark");
    }, [refresh]),
  );

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors["primary-foreground"]}
            onRefresh={async () => {
              setRefreshing(true);
              refresh();
              await onRefresh();
              setRefreshing(false);
            }}
          />
        ) : undefined
      }
    >
      <View style={[styles.hero, { paddingTop: insets.top + spacing(3) }]}>
        <View style={styles.overscroll} />
        <View style={styles.heroTop}>
          <View style={styles.brand}>
            <LogoMark size={28} tone="white" />
            <Text style={styles.brandName}>{fr.brand}</Text>
          </View>
          <Pressable
            role="button"
            aria-label={fr.notificationCenter.bell(notifications)}
            onPress={() => router.push("/notifications")}
            style={({ pressed }) => [styles.roundButton, pressed && styles.pressed]}
          >
            <Bell size={22} color={colors["primary-foreground"]} />
            {notifications > 0 ? (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{notifications > 9 ? "9+" : notifications}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
        <View style={styles.heroText}>
          <Text role="heading" style={styles.greeting}>
            {title}
          </Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
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
        {badges}
      </View>
      <View style={styles.body}>{children}</View>
    </ScrollView>
  );
}

/** Garanties de MENAO, en puces sous la recherche. */
function Tags() {
  return (
    <View style={styles.tags}>
      {fr.home.tags.map((tag) => (
        <View key={tag} style={styles.tag}>
          <BadgeCheck size={14} color={colors["primary-foreground"]} />
          <Text style={styles.tagText}>{tag}</Text>
        </View>
      ))}
    </View>
  );
}

/** Raccourcis par métier vers la recherche. */
function TradeShortcuts({ title, text }: { title: string; text: string }) {
  const trades = useTrades();
  if (trades.length === 0) return null;
  return (
    <Section title={title} text={text}>
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
  );
}

/** « Comment ça marche », en quatre étapes. */
function Steps() {
  return (
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
  bellBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors["primary-strong"],
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadgeText: { fontFamily: font.bold, fontSize: 10, color: colors["primary-foreground"] },
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
