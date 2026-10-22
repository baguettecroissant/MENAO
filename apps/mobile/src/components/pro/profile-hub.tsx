import type { ProfileTip } from "@menao/core";
import type { ReferralRow, WelcomeGift } from "@menao/validation";
import Constants from "expo-constants";
import { router, type Href } from "expo-router";
import {
  Award,
  BadgeCheck,
  Bell,
  Building2,
  CalendarClock,
  Camera,
  ChevronRight,
  Eye,
  FolderCheck,
  Gift,
  IdCard,
  Images,
  LifeBuoy,
  MapPin,
  ReceiptText,
  Share2,
  ShieldCheck,
  Star,
  UserRound,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Image, Share, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, ReduceMotion } from "react-native-reanimated";
import { ProgressRing } from "@/components/progress-ring";
import { SettingsRow, SettingsSection } from "@/components/settings-list";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { signOut } from "@/lib/auth";
import { formatDay } from "@/lib/format";
import { choosePhotoSource, pickPhotos, uploadPhoto } from "@/lib/photos";
import { loadProfileHub, type ProfileHub } from "@/lib/profile-hub";
import type { HubRow, HubStatus } from "@/lib/profile-hub-status";
import { forgetProfileSummary } from "@/lib/profile-summary";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Button, Notice, Screen, ScreenSkeleton, Tappable, toast } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proHub;
const { colors, font, radius, spacing } = theme;

type Row = {
  key: HubRow | "invoices" | "identity" | "notifications" | "help";
  icon: LucideIcon;
  href: Href;
};

/** Rubriques de « Mon profil », dans l'ordre des maquettes de la refonte (ADR 0129). */
const SECTIONS: { key: keyof typeof t.sections; rows: Row[] }[] = [
  {
    key: "profile",
    rows: [
      { key: "photo", icon: UserRound, href: "/pro-profil-public" },
      { key: "portfolio", icon: Images, href: "/pro-profil-public" },
      { key: "reviews", icon: Star, href: "/pro-avis" },
      { key: "grade", icon: Award, href: "/pro-grade" },
    ],
  },
  {
    key: "company",
    rows: [
      { key: "company", icon: Building2, href: "/pro-entreprise" },
      { key: "trades", icon: Wrench, href: "/pro-metiers" },
      { key: "zone", icon: MapPin, href: "/pro-zone" },
      { key: "availability", icon: CalendarClock, href: "/pro-disponibilites" },
    ],
  },
  {
    key: "compliance",
    rows: [
      { key: "documents", icon: FolderCheck, href: "/pro-documents" },
      { key: "charter", icon: BadgeCheck, href: "/pro-charte" },
    ],
  },
  {
    key: "money",
    rows: [
      { key: "payments", icon: Wallet, href: "/pro-paiements" },
      { key: "invoices", icon: ReceiptText, href: "/pro-factures" },
    ],
  },
  {
    key: "account",
    rows: [
      { key: "identity", icon: IdCard, href: "/compte-reglages" },
      { key: "notifications", icon: Bell, href: "/notifications" },
      { key: "help", icon: LifeBuoy, href: "/aide" },
    ],
  },
];

/** Où mène le conseil de la jauge. */
const TIP_HREF: Record<ProfileTip, Href> = {
  assure_verifie: "/pro-documents",
  photo_profil: "/pro-profil-public",
  realisations: "/pro-profil-public",
  presentation: "/pro-profil-public",
  specialites: "/pro-metiers",
  certifications: "/pro-metiers",
};

/**
 * « Mon profil » de l'artisan (ADR 0129), ouvert par la photo de l'en-tête des onglets : tout
 * l'essentiel de la fiche, de l'entreprise, de la conformité, de l'argent et du compte, avec
 * l'état de chaque rubrique, à deux touchers au plus. Aucun abonnement ni lien vers le site
 * (CLAUDE.md règle 10).
 */
export function ProfileHubScreen() {
  const [hub, reload] = useFocusData(loadProfileHub);
  if (hub === undefined) return <ScreenSkeleton header={<TopBar />} cards={4} />;
  return (
    <Screen header={<TopBar />} onRefresh={reload}>
      {hub === null ? (
        <Notice tone="error">{t.loadError}</Notice>
      ) : (
        <ProfileHubContent hub={hub} onChange={reload} />
      )}
    </Screen>
  );
}

/** Apparition en cascade des blocs à l'ouverture (désactivée avec « Réduire les animations »). */
const enter = (index: number) =>
  FadeInDown.delay(60 * index)
    .duration(320)
    .reduceMotion(ReduceMotion.System);

export function ProfileHubContent({
  hub,
  onChange,
}: {
  hub: ProfileHub;
  onChange: () => Promise<void>;
}) {
  const [leaving, setLeaving] = useState(false);
  return (
    <>
      <Animated.View entering={enter(0)}>
        <Header hub={hub} onChange={onChange} />
      </Animated.View>
      {hub.status === "brouillon" || hub.status === "refuse" ? (
        <Animated.View entering={enter(1)}>
          <Tappable
            role="link"
            aria-label={`${t.dossier}, ${t.dossierLeft(hub.itemsLeft)}`}
            onPress={() => router.push("/pro")}
            style={styles.dossier}
          >
            <View style={styles.dossierText}>
              <Text style={styles.dossierTitle}>{t.dossier}</Text>
              <Text style={styles.dossierHint}>{t.dossierLeft(hub.itemsLeft)}</Text>
            </View>
            <ChevronRight size={20} color={colors["primary-foreground"]} />
          </Tappable>
        </Animated.View>
      ) : hub.status === "en_verification" ? (
        <Notice tone="info">{t.dossierSent}</Notice>
      ) : null}
      <Animated.View entering={enter(2)}>
        <Strength hub={hub} />
      </Animated.View>
      <Animated.View entering={enter(3)}>
        <Button
          label={t.seeProfile}
          icon={Eye}
          variant="secondary"
          onPress={() => router.push("/pro-ma-fiche")}
        />
      </Animated.View>
      {hub.welcomeGift ? (
        <Animated.View entering={enter(4)}>
          <WelcomeGiftCard gift={hub.welcomeGift} />
        </Animated.View>
      ) : null}
      {hub.referral ? (
        <Animated.View entering={enter(4)}>
          <ReferralCard
            code={hub.referral.code}
            joined={hub.referral.joined}
            rewarded={hub.referral.rewarded}
            referrals={hub.referrals}
          />
        </Animated.View>
      ) : null}
      {SECTIONS.map((section, index) => (
        <Animated.View key={section.key} entering={enter(5 + index)}>
          <SettingsSection title={t.sections[section.key]}>
            {section.rows.map((row) => {
              const status = statusOf(row.key, hub);
              return (
                <SettingsRow
                  key={row.key}
                  icon={row.icon}
                  label={t.rows[row.key]}
                  value={status?.text}
                  tone={status?.tone}
                  href={row.href}
                />
              );
            })}
          </SettingsSection>
        </Animated.View>
      ))}
      <Button
        label={t.signOut}
        variant="danger"
        loading={leaving}
        onPress={async () => {
          setLeaving(true);
          await signOut();
          setLeaving(false);
        }}
      />
      <Body muted>{fr.account.version(Constants.expoConfig?.version ?? "")}</Body>
    </>
  );
}

function statusOf(key: Row["key"], hub: ProfileHub): HubStatus {
  if (key === "identity") return hub.email ? { text: hub.email, tone: "neutral" } : null;
  if (key === "invoices" || key === "notifications" || key === "help") return null;
  return hub.statuses[key];
}

function Header({ hub, onChange }: { hub: ProfileHub; onChange: () => Promise<void> }) {
  const [sending, setSending] = useState(false);

  // Photo changée d'un toucher, comme dans « Photo et présentation ».
  async function changePhoto() {
    const source = await choosePhotoSource(t.photoTitle);
    if (!source) return;
    const picked = await pickPhotos(source, 1, true);
    if ("error" in picked) return toast.error(picked.error);
    const photo = picked.photos[0];
    if (!photo) return;
    setSending(true);
    const status = await uploadPhoto({ purpose: "avatar" }, photo);
    setSending(false);
    if (status !== "ok")
      return toast.error(fr.search.upload[status] ?? fr.search.upload.unavailable);
    forgetProfileSummary();
    toast.success(t.photoDone);
    await onChange();
  }

  const statusLabel = hub.status === "valide" ? null : t.status[hub.status];
  return (
    <View style={styles.header}>
      <Tappable
        role="button"
        aria-label={t.changePhoto}
        onPress={changePhoto}
        disabled={sending}
        scaleTo={0.94}
        style={styles.avatarWrap}
      >
        <View style={styles.avatar}>
          {hub.avatarUrl ? (
            <Image source={{ uri: hub.avatarUrl }} style={styles.avatarImage} alt="" />
          ) : (
            <Text style={styles.initials}>{hub.initials}</Text>
          )}
          {sending ? (
            <View style={styles.avatarBusy}>
              <ActivityIndicator color={colors["primary-foreground"]} />
            </View>
          ) : null}
        </View>
        <View style={styles.camera}>
          <Camera size={14} color={colors["primary-strong"]} />
        </View>
      </Tappable>
      <View style={styles.identity}>
        <Text role="heading" style={styles.name} numberOfLines={2}>
          {hub.name}
        </Text>
        {hub.company || hub.city ? (
          <Text style={styles.company} numberOfLines={1}>
            {[hub.company, hub.city].filter(Boolean).join(" · ")}
          </Text>
        ) : null}
        <View style={styles.pills}>
          {hub.verified ? <Pill icon={ShieldCheck} text={t.verified} tone="success" /> : null}
          {statusLabel ? <Pill text={statusLabel} tone="warning" /> : null}
          {hub.score ? (
            <Pill icon={Star} text={t.score(hub.score.percent, hub.score.count)} tone="primary" />
          ) : null}
        </View>
      </View>
    </View>
  );
}

function Pill({
  icon: Icon,
  text,
  tone,
}: {
  icon?: LucideIcon;
  text: string;
  tone: "success" | "warning" | "primary";
}) {
  const palette = {
    success: { bg: colors["success-soft"], fg: colors.success },
    warning: { bg: colors["warning-soft"], fg: colors.warning },
    primary: { bg: colors["primary-soft"], fg: colors["primary-strong"] },
  }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: palette.bg }]}>
      {Icon ? <Icon size={13} color={palette.fg} /> : null}
      <Text style={[styles.pillText, { color: palette.fg }]}>{text}</Text>
    </View>
  );
}

function Strength({ hub }: { hub: ProfileHub }) {
  const { percent, next } = hub.strength;
  const title = next ? t.strength(percent) : t.complete;
  const hint = next ? t.tips[next] : t.completeHint;
  return (
    <Tappable
      role={next ? "link" : undefined}
      aria-label={`${title}. ${hint}`}
      onPress={next ? () => router.push(TIP_HREF[next]) : undefined}
      disabled={!next}
      style={styles.strength}
    >
      <ProgressRing percent={percent} />
      <View style={styles.strengthText}>
        <Text style={styles.strengthTitle}>{title}</Text>
        <Text style={styles.strengthHint}>{hint}</Text>
      </View>
      {next ? <ChevronRight size={20} color={colors["muted-foreground"]} /> : null}
    </Tappable>
  );
}

/**
 * Cadeau de bienvenue du filleul (ADR 0154) : à choisir sur l'écran « Votre cadeau », puis l'état
 * de l'envoi.
 */
function WelcomeGiftCard({ gift }: { gift: WelcomeGift }) {
  const g = t.welcomeGift;
  return (
    <View style={styles.referral} accessibilityRole="summary">
      <View style={styles.referralHead}>
        <View style={styles.referralIcon}>
          <Gift size={20} color={colors.primary} />
        </View>
        <View style={styles.referralText}>
          <Text style={styles.referralTitle}>{g.title}</Text>
          <Text style={styles.referralLead}>
            {gift.status === "a_choisir"
              ? g.lead(gift.referrer)
              : [
                  gift.item ? g.summary(g.items[gift.item], gift.size) : null,
                  gift.status === "envoye" && gift.sent_at
                    ? g.sent(formatDay(gift.sent_at))
                    : g.pending,
                ]
                  .filter(Boolean)
                  .join(" · ")}
          </Text>
        </View>
      </View>
      {gift.status === "a_choisir" ? (
        <Button label={g.choose} icon={Gift} onPress={() => router.push("/pro-cadeau")} />
      ) : null}
    </View>
  );
}

/**
 * Parrainage (F-60, ADR 0137 et 0161) : le code à partager, le score de fidélité et le suivi de
 * chaque filleul. Ni lien vers le site ni mention de l'abonnement dans l'application (CLAUDE.md
 * règle 10).
 */
function ReferralCard({
  code,
  joined,
  rewarded,
  referrals,
}: {
  code: string;
  joined: number;
  rewarded: number;
  referrals: ReferralRow[];
}) {
  const r = t.referral;
  return (
    <View style={styles.referral} accessibilityRole="summary">
      <View style={styles.referralHead}>
        <View style={styles.referralIcon}>
          <Gift size={20} color={colors.primary} />
        </View>
        <View style={styles.referralText}>
          <Text style={styles.referralTitle}>{r.title}</Text>
          <Text style={styles.referralLead}>{r.lead}</Text>
        </View>
      </View>
      <View
        style={styles.referralCodeBox}
        accessible
        accessibilityLabel={`${r.codeLabel} : ${code}`}
      >
        <Text style={styles.referralCodeLabel}>{r.codeLabel}</Text>
        <Text style={styles.referralCode} selectable>
          {code.toUpperCase()}
        </Text>
      </View>
      <Button
        label={r.share}
        icon={Share2}
        variant="secondary"
        onPress={() => Share.share({ message: r.shareMessage(code.toUpperCase()) })}
      />
      <Text style={styles.referralJoined}>{r.joined(joined)}</Text>
      <Text style={styles.referralJoined}>
        {r.loyalty(rewarded)} · {r.loyaltyHint}
      </Text>
      {referrals.length ? (
        <View style={styles.referralList}>
          <Text style={styles.referralCodeLabel}>{r.listTitle}</Text>
          {referrals.map((row) => (
            <View key={row.id} style={styles.referralRow}>
              <Text style={styles.referralName} numberOfLines={1}>
                {row.nom}
              </Text>
              <Text
                style={[styles.referralStep, row.etape === "abonne" && styles.referralStepDone]}
              >
                {r.steps[row.etape]}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  referral: {
    gap: spacing(3),
    padding: spacing(4),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors["primary-soft"],
    backgroundColor: colors["primary-softer"],
  },
  referralHead: { flexDirection: "row", gap: spacing(3), alignItems: "flex-start" },
  referralIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  referralText: { flex: 1, gap: 2 },
  referralTitle: { fontFamily: font.bold, fontSize: 16, color: colors.foreground },
  referralLead: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  referralCodeBox: {
    alignItems: "center",
    gap: 2,
    paddingVertical: spacing(3),
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  referralCodeLabel: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
  referralCode: {
    fontFamily: font.bold,
    fontSize: 24,
    letterSpacing: 3,
    color: colors["primary-strong"],
  },
  referralJoined: { fontFamily: font.medium, fontSize: 13, color: colors["muted-foreground"] },
  referralList: { gap: spacing(1.5) },
  referralRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing(3),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing(1.5),
  },
  referralName: { flex: 1, fontFamily: font.medium, fontSize: 14, color: colors.foreground },
  referralStep: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  referralStepDone: { color: colors.success },
  header: { flexDirection: "row", alignItems: "center", gap: spacing(4) },
  avatarWrap: { width: 76, height: 76 },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    overflow: "hidden",
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: { width: 76, height: 76 },
  avatarBusy: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(17,23,40,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { fontFamily: font.bold, fontSize: 26, color: colors["primary-foreground"] },
  camera: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  identity: { flex: 1, gap: spacing(1) },
  name: { fontFamily: font.bold, fontSize: 22, lineHeight: 28, color: colors.foreground },
  company: { fontFamily: font.regular, fontSize: 14, color: colors["muted-foreground"] },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: spacing(1.5), marginTop: spacing(1) },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1),
    borderRadius: radius.pill,
  },
  pillText: { fontFamily: font.medium, fontSize: 12 },
  dossier: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    padding: spacing(4),
    borderRadius: radius.card,
    backgroundColor: colors.primary,
  },
  dossierText: { flex: 1, gap: 2 },
  dossierTitle: { fontFamily: font.bold, fontSize: 16, color: colors["primary-foreground"] },
  dossierHint: { fontFamily: font.regular, fontSize: 13, color: colors["primary-soft"] },
  strength: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3.5),
    padding: spacing(4),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  strengthText: { flex: 1, gap: 2 },
  strengthTitle: { fontFamily: font.bold, fontSize: 16, color: colors.foreground },
  strengthHint: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
});
