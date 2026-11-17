import type { ClientHomeSummary } from "@menao/core";
import { router, useFocusEffect } from "expo-router";
import {
  ArrowRight,
  Bell,
  Camera,
  Check,
  ChevronRight,
  Clock,
  MessageCircle,
  Mic,
  ShieldCheck,
  Siren,
  UserRound,
  type LucideIcon,
} from "lucide-react-native";
import { useCallback, useState, type ReactNode } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AvatarImage } from "@/components/avatar";
import { ClientDashboard } from "@/components/client-dashboard";
import { Logo } from "@/components/logo";
import { PushPrompt } from "@/components/push-prompt";
import { tradeIcon } from "@/components/trade-icon";
import { fr } from "@/i18n/fr";
import { loadClientHome } from "@/lib/client-home";
import { openTab } from "@/lib/navigation";
import { useProfileSummary } from "@/lib/profile-summary";
import { useSession } from "@/lib/session";
import { useTrades } from "@/lib/trades";
import { useUnread } from "@/lib/unread";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice, Skeleton, Tappable } from "@/ui";
import { theme } from "@/ui/theme";

const { colors, font, radius, spacing } = theme;
/** Métiers de la rangée qui défile ; les autres par « Tous les métiers ». */
const SHORTCUTS = 8;
// Photos du site (personnages fictifs), réduites pour l'application.
const HERO: ImageSourcePropType = require("../../assets/home/accueil.jpg");
const STEP_IMAGES: ImageSourcePropType[] = [
  require("../../assets/home/etape-projet.jpg"),
  require("../../assets/home/etape-artisans.jpg"),
  require("../../assets/home/etape-suivi.jpg"),
];

const t = fr.home.dashboard;
const h = fr.home;

/**
 * Accueil de l'espace client (ADR 0055), ouvert à tous sans compte. Refonte du lot 65 (ADR 0359,
 * maquettes « AccueilAppVisiteur » et « AccueilAppConnecte ») : ambiance claire avec photo, une
 * promesse en titre, la saisie comme élément principal (exemples, photo, dictée, urgence), les
 * contrôles faits sur chaque artisan, les métiers en une rangée et « Comment ça marche » illustré.
 * Un client connecté y trouve son tableau de bord (ADR 0082), remis à zéro au changement de compte.
 */
export function HomeScreen() {
  const { signedIn, session } = useSession();
  if (signedIn && session) return <ClientHome key={session.user.id} />;
  return <GuestHome />;
}

function GuestHome() {
  return (
    <HomeFrame>
      <View style={styles.photo}>
        <Image source={HERO} style={styles.photoImage} resizeMode="cover" alt={h.photoAlt} />
        <View style={styles.photoBadge}>
          <ShieldCheck size={15} color={colors.success} />
          <Text style={styles.photoBadgeText}>{h.photoBadge}</Text>
        </View>
      </View>
      <View style={styles.head}>
        <Text role="heading" aria-level={1} style={styles.title}>
          {h.title}
        </Text>
        <Text style={styles.subtitle}>{h.subtitle}</Text>
      </View>
      <NeedEntry />
      <View style={styles.card}>
        <Text role="heading" style={styles.sectionTitle}>
          {h.verifyTitle}
        </Text>
        {h.verify.map((item) => (
          <View key={item.title} style={styles.proof}>
            <View style={styles.proofIcon}>
              <Check size={17} strokeWidth={3} color={colors.success} />
            </View>
            <View style={styles.proofText}>
              <Text style={styles.proofTitle}>{item.title}</Text>
              <Text style={styles.muted}>{item.text}</Text>
            </View>
          </View>
        ))}
      </View>
      <TradeRow />
      <Steps />
      <Tappable
        role="link"
        aria-label={`${h.artisan.title} ${h.artisan.text}`}
        onPress={() => router.push("/pro-inscription")}
        style={styles.artisan}
      >
        <View style={styles.proofText}>
          <Text style={styles.artisanTitle}>{h.artisan.title}</Text>
          <Text style={styles.artisanText}>{h.artisan.text}</Text>
        </View>
        <ChevronRight size={20} color={colors["primary-foreground"]} />
      </Tappable>
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
      return t.newProjectTitle;
  }
};

/**
 * Tableau de bord du client connecté (ADR 0082) : message personnalisé, la saisie d'un nouveau
 * projet, ce qui l'attend, prochains rendez-vous et chantiers en cours, puis les métiers. Sans
 * chantier ni demande, l'accueil garde « Comment ça marche ».
 */
function ClientHome() {
  const [home, reload] = useFocusData(loadClientHome);
  const { messages } = useUnread();
  const counters: { icon: LucideIcon; label: string; onPress: () => void }[] = home
    ? [
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
    <HomeFrame onRefresh={reload}>
      <View style={styles.head}>
        <Text role="heading" aria-level={1} style={styles.hello}>
          {t.hello(home?.firstName ?? null)}
        </Text>
        <Text style={styles.subtitle}>{home ? summaryText(home.summary) : t.newProjectTitle}</Text>
        {counters.length > 0 ? (
          <View style={styles.counters}>
            {counters.map(({ icon: Icon, label, onPress }) => (
              <Tappable key={label} role="link" onPress={onPress} style={styles.counter}>
                <Icon size={14} color={colors["primary-strong"]} />
                <Text style={styles.counterText}>{label}</Text>
              </Tappable>
            ))}
          </View>
        ) : null}
      </View>
      <NeedEntry compact />
      <PushPrompt />
      {home === undefined ? (
        // Premier chargement : la forme de l'accueil plutôt qu'un rond qui tourne (ADR 0128).
        <View aria-busy role="progressbar" aria-label={fr.nav.loading} style={styles.skeleton}>
          <Skeleton width="45%" height={20} />
          <Skeleton height={64} />
          <Skeleton height={64} />
          <Skeleton width="55%" height={20} />
          <Skeleton height={96} />
        </View>
      ) : home === null ? (
        <Notice tone="error">{t.error}</Notice>
      ) : (
        <ClientDashboard home={home} />
      )}
      <TradeRow />
      {fresh ? <Steps /> : null}
    </HomeFrame>
  );
}

/**
 * Fond clair, marque, cloche et compte, puis le contenu. Tirer vers le bas relit les données
 * (`onRefresh`) et les compteurs de la cloche.
 */
function HomeFrame({
  onRefresh,
  children,
}: {
  onRefresh?: () => Promise<void>;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { notifications, refresh } = useUnread();
  const profile = useProfileSummary();
  const [refreshing, setRefreshing] = useState(false);

  // Retour sur l'accueil : pastille de la cloche à jour.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing(2) }]}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.primary}
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
      <View style={styles.top}>
        <View style={styles.brand}>
          <Logo size={28} />
        </View>
        <Pressable
          role="button"
          aria-label={fr.notificationCenter.bell(notifications)}
          onPress={() => router.push("/notifications")}
          style={({ pressed }) => [styles.roundButton, pressed && styles.pressed]}
        >
          <Bell size={21} color={colors.foreground} />
          {notifications > 0 ? (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{notifications > 9 ? "9+" : notifications}</Text>
            </View>
          ) : null}
        </Pressable>
        {/* Photo du compte, comme l'en-tête des onglets (maquettes) : ouvre « Mon compte ». */}
        <Pressable
          role="link"
          aria-label={fr.account.title}
          onPress={() => router.push("/compte")}
          style={({ pressed }) => [
            styles.roundButton,
            styles.avatar,
            profile?.initials && !profile.avatarUrl ? styles.avatarFilled : null,
            pressed && styles.pressed,
          ]}
        >
          {profile?.avatarUrl ? (
            <AvatarImage uri={profile.avatarUrl} style={styles.avatarImage} />
          ) : profile?.initials ? (
            <Text style={styles.avatarInitial}>{profile.initials}</Text>
          ) : (
            <UserRound size={21} color={colors.foreground} />
          )}
        </Pressable>
      </View>
      {children}
    </ScrollView>
  );
}

/**
 * Entrée de la demande (maquette du lot 65) : la carte ouvre l'écran de saisie ; « Photo »,
 * « Dicter » et « Urgent » l'ouvrent avec l'action déjà lancée, un exemple avec son texte.
 */
function NeedEntry({ compact = false }: { compact?: boolean }) {
  const open = (params: { texte?: string; urgent?: string; action?: string } = {}) =>
    router.push({ pathname: "/recherche", params });
  const tool = (Icon: LucideIcon, label: string, onPress: () => void) => (
    <Pressable
      role="button"
      aria-label={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.tool, pressed && styles.pressed]}
    >
      <Icon size={17} color={colors.foreground} />
      <Text style={styles.toolText}>{label}</Text>
    </Pressable>
  );
  return (
    <>
      <View style={styles.entry}>
        <Pressable
          role="button"
          aria-label={h.tools.go}
          onPress={() => open()}
          style={[styles.entryField, compact && styles.entryFieldCompact]}
        >
          <Text style={styles.entryPlaceholder}>{h.searchPlaceholder}</Text>
        </Pressable>
        <View style={styles.tools}>
          {tool(Camera, h.tools.photo, () => open({ action: "photo" }))}
          {tool(Mic, h.tools.dictate, () => open({ action: "dictee" }))}
          <Pressable
            role="button"
            aria-label={h.tools.urgent}
            onPress={() => open({ urgent: "1" })}
            hitSlop={4}
            style={({ pressed }) => [styles.tool, styles.toolUrgent, pressed && styles.pressed]}
          >
            <Siren size={16} color={colors.warning} />
            <Text style={[styles.toolText, styles.toolUrgentText]}>{h.tools.urgent}</Text>
          </Pressable>
          <View style={styles.spacer} />
          <Pressable
            role="button"
            aria-label={h.tools.go}
            onPress={() => open()}
            style={({ pressed }) => [styles.go, pressed && styles.pressed]}
          >
            <ArrowRight size={22} color={colors["primary-foreground"]} />
          </Pressable>
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        aria-label={h.examplesLabel}
        style={styles.bleed}
        contentContainerStyle={styles.bleedContent}
      >
        {h.examples.map((example) => (
          <Pressable
            key={example}
            role="button"
            onPress={() => open({ texte: example })}
            style={({ pressed }) => [styles.example, pressed && styles.pressed]}
          >
            <Text style={styles.exampleText}>{example}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </>
  );
}

/** Métiers en une rangée qui défile, vers la recherche. */
function TradeRow() {
  const trades = useTrades();
  if (trades.length === 0) return null;
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text role="heading" style={styles.sectionTitle}>
          {h.tradesTitle}
        </Text>
        <Pressable role="link" onPress={() => router.push("/recherche")} hitSlop={8}>
          <Text style={styles.link}>{h.allTrades}</Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.bleed}
        contentContainerStyle={styles.bleedContent}
      >
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
                <Icon size={26} color={colors.primary} />
              </View>
              <Text style={styles.tradeLabel} numberOfLines={1}>
                {trade.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** « Comment ça marche », en trois étapes illustrées. */
function Steps() {
  return (
    <View style={styles.section}>
      <Text role="heading" style={styles.sectionTitle}>
        {h.stepsTitle}
      </Text>
      {h.illustratedSteps.map((step, i) => (
        <View key={step.title} style={styles.step}>
          <Image source={STEP_IMAGES[i]} style={styles.stepImage} alt="" />
          <View style={styles.proofText}>
            <Text style={styles.stepLabel}>{h.stepLabel(i + 1)}</Text>
            <Text style={styles.proofTitle}>{step.title}</Text>
            <Text style={styles.muted}>{step.text}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const GUTTER = spacing(4);

const styles = StyleSheet.create({
  skeleton: { gap: spacing(3) },
  page: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: GUTTER, paddingBottom: spacing(10), gap: spacing(4.5) },
  top: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  brand: { flex: 1, alignItems: "flex-start" },
  roundButton: {
    width: theme.touchTarget,
    height: theme.touchTarget,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadgeText: { fontFamily: font.bold, fontSize: 10, color: colors["primary-foreground"] },
  avatar: { overflow: "hidden" },
  avatarFilled: { backgroundColor: colors.foreground, borderColor: colors.foreground },
  avatarImage: { width: theme.touchTarget, height: theme.touchTarget },
  avatarInitial: { fontFamily: font.bold, fontSize: 15, color: colors["primary-foreground"] },
  pressed: { opacity: 0.8 },
  photo: { height: 216, borderRadius: 26, overflow: "hidden", backgroundColor: colors.border },
  photoImage: { width: "100%", height: "100%" },
  photoBadge: {
    position: "absolute",
    left: spacing(3),
    bottom: spacing(3),
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.5),
    height: 32,
    paddingHorizontal: spacing(3),
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
  },
  photoBadgeText: { fontFamily: font.semibold, fontSize: 13, color: colors.foreground },
  head: { gap: spacing(1.5) },
  title: {
    fontFamily: font.display,
    fontSize: 34,
    lineHeight: 36,
    letterSpacing: -1.1,
    color: colors.foreground,
  },
  hello: {
    fontFamily: font.display,
    fontSize: 32,
    lineHeight: 35,
    letterSpacing: -1,
    color: colors.foreground,
  },
  subtitle: { fontFamily: font.regular, fontSize: 16, lineHeight: 23, color: colors.label },
  counters: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2), marginTop: spacing(1) },
  counter: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.5),
    borderRadius: radius.pill,
    backgroundColor: colors["primary-soft"],
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
  },
  counterText: { fontFamily: font.semibold, fontSize: 13, color: colors["primary-strong"] },
  entry: {
    gap: spacing(3.5),
    padding: spacing(4),
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    boxShadow: "0 14px 34px rgba(17, 23, 40, 0.08)",
  },
  entryField: { minHeight: 66 },
  entryFieldCompact: { minHeight: 44 },
  entryPlaceholder: {
    fontFamily: font.regular,
    fontSize: 17,
    lineHeight: 24,
    color: colors["muted-foreground"],
  },
  // Trois outils et le bouton d'envoi sur une ligne, même sur un petit iPhone (375 points).
  tools: { flexDirection: "row", alignItems: "center", gap: 6 },
  tool: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 40,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: colors.background,
  },
  toolText: { fontFamily: font.semibold, fontSize: 13, color: colors.foreground },
  toolUrgent: { backgroundColor: colors["warning-soft"] },
  toolUrgentText: { fontFamily: font.bold, color: colors.warning },
  spacer: { flex: 1 },
  go: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  // Rangées qui défilent jusqu'au bord droit de l'écran.
  bleed: { marginHorizontal: -GUTTER, flexGrow: 0 },
  bleedContent: { paddingHorizontal: GUTTER, gap: spacing(2) },
  example: {
    height: 38,
    paddingHorizontal: spacing(3.5),
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors["border-strong"],
    backgroundColor: colors.surface,
    justifyContent: "center",
  },
  exampleText: { fontFamily: font.medium, fontSize: 13.5, color: colors.foreground },
  card: {
    gap: spacing(3.5),
    padding: spacing(4.5),
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  section: { gap: spacing(3) },
  sectionHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  sectionTitle: {
    fontFamily: font.display,
    fontSize: 20,
    letterSpacing: -0.4,
    color: colors.foreground,
  },
  link: { fontFamily: font.semibold, fontSize: 14, color: colors["primary-strong"] },
  proof: { flexDirection: "row", alignItems: "flex-start", gap: spacing(3) },
  proofIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors["success-soft"],
    alignItems: "center",
    justifyContent: "center",
  },
  proofText: { flex: 1, gap: 2 },
  proofTitle: { fontFamily: font.bold, fontSize: 15.5, color: colors.foreground },
  muted: {
    fontFamily: font.regular,
    fontSize: 13.5,
    lineHeight: 19,
    color: colors["muted-foreground"],
  },
  trade: { width: 78, alignItems: "center", gap: spacing(2) },
  tradeIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  tradeLabel: {
    fontFamily: font.medium,
    fontSize: 12.5,
    color: colors.foreground,
    textAlign: "center",
  },
  step: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    padding: spacing(2.5),
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  stepImage: { width: 84, height: 84, borderRadius: 12 },
  stepLabel: {
    fontFamily: font.bold,
    fontSize: 12,
    letterSpacing: 0.7,
    color: colors["primary-strong"],
  },
  artisan: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    paddingVertical: spacing(3.5),
    paddingHorizontal: spacing(4),
    borderRadius: 18,
    backgroundColor: colors.foreground,
  },
  artisanTitle: { fontFamily: font.bold, fontSize: 15.5, color: colors["primary-foreground"] },
  artisanText: { fontFamily: font.regular, fontSize: 13.5, color: "rgba(255, 255, 255, 0.8)" },
});
