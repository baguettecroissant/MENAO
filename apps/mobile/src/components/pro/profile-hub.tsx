import type { ProfileTip } from "@menao/core";
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
  IdCard,
  Images,
  LifeBuoy,
  MapPin,
  ReceiptText,
  ShieldCheck,
  Star,
  UserRound,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, ReduceMotion } from "react-native-reanimated";
import { ProgressRing } from "@/components/progress-ring";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { signOut } from "@/lib/auth";
import { choosePhotoSource, pickPhotos, uploadPhoto } from "@/lib/photos";
import { loadProfileHub, type ProfileHub } from "@/lib/profile-hub";
import type { HubRow, HubStatus, HubTone } from "@/lib/profile-hub-status";
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

const TONE: Record<HubTone, string> = {
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
  neutral: colors["muted-foreground"],
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
      {SECTIONS.map((section, index) => (
        <Animated.View key={section.key} entering={enter(4 + index)} style={styles.section}>
          <Text role="heading" style={styles.sectionTitle}>
            {t.sections[section.key]}
          </Text>
          <View style={styles.group}>
            {section.rows.map((row, i) => (
              <HubLine key={row.key} row={row} first={i === 0} status={statusOf(row.key, hub)} />
            ))}
          </View>
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

function HubLine({ row, status, first }: { row: Row; status: HubStatus; first: boolean }) {
  const label = t.rows[row.key];
  const Icon = row.icon;
  return (
    <Tappable
      role="link"
      aria-label={status ? `${label}, ${status.text}` : label}
      onPress={() => router.push(row.href)}
      scaleTo={0.985}
      style={[styles.row, !first && styles.rowBorder]}
    >
      <View style={styles.rowIcon}>
        <Icon size={18} color={colors["primary-strong"]} />
      </View>
      <Text style={styles.rowLabel} numberOfLines={2}>
        {label}
      </Text>
      {status ? (
        <Text style={[styles.rowStatus, { color: TONE[status.tone] }]} numberOfLines={1}>
          {status.text}
        </Text>
      ) : null}
      <ChevronRight size={18} color={colors["subtle-foreground"]} />
    </Tappable>
  );
}

const styles = StyleSheet.create({
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
  section: { gap: spacing(2) },
  sectionTitle: {
    fontFamily: font.medium,
    fontSize: 13,
    color: colors["muted-foreground"],
    marginLeft: spacing(1),
  },
  group: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    minHeight: 52,
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(2.5),
    backgroundColor: colors.surface,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: colors["primary-soft"],
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { flex: 1, fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  rowStatus: { maxWidth: "45%", fontFamily: font.medium, fontSize: 13 },
});
