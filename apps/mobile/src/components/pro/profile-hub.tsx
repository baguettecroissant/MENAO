import { teamCan, type ProfileTip, type TeamPermission } from "@menao/core";
import type { WelcomeGift } from "@menao/validation";
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
  Euro,
  Eye,
  FileText,
  Gift,
  ImageIcon,
  LifeBuoy,
  ListChecks,
  MapPin,
  PenLine,
  ReceiptText,
  Send,
  ShieldCheck,
  ShoppingCart,
  Star,
  UserRound,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Switch, Text, View } from "react-native";
import Animated, { FadeInDown, ReduceMotion } from "react-native-reanimated";
import { ListGroup } from "@/components/list-kit";
import { ProgressRing } from "@/components/progress-ring";
import {
  FicheButton,
  FicheScreen,
  FicheSkeleton,
  FicheTag,
  TAG_TONES,
  type FicheTone,
} from "@/components/pro/fiche-kit";
import { ShareCard } from "@/components/pro/share-card";
import { fr } from "@/i18n/fr";
import { signOut } from "@/lib/auth";
import { formatDay } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { choosePhotoSource, pickAvatar, uploadPhoto } from "@/lib/photos";
import { loadProfileHub, type ProfileHub } from "@/lib/profile-hub";
import type { HubRow, HubStatus } from "@/lib/profile-hub-status";
import { forgetProfileSummary } from "@/lib/profile-summary";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Button, Notice, Tappable, toast } from "@/ui";
import { theme } from "@/ui/theme";
import { ExampleLock } from "@/components/examples";
import { setExamplesActive, useExamplesActive } from "@/lib/examples";

const t = fr.proHub;
const { colors, font, radius, spacing } = theme;

type Row = {
  key:
    | HubRow
    | "team"
    | "invoices"
    | "expenses"
    | "accountant"
    | "identity"
    | "notifications"
    | "help";
  icon: LucideIcon;
  /** Couleur du carré de l'icône (maquette « ProfilApp »). */
  tone: FicheTone;
  href: Href;
};

/**
 * Droit nécessaire pour chaque rubrique (ADR 0241), comme sur le site : un membre de l'équipe ne
 * voit que les siennes (compte, notifications, aide ; disponibilités, factures et dépenses pour le
 * chef d'équipe).
 */
const ROW_PERMISSION: Partial<Record<Row["key"], TeamPermission>> = {
  photo: "storefront",
  portfolio: "storefront",
  reviews: "storefront",
  grade: "storefront",
  company: "storefront",
  trades: "storefront",
  zone: "storefront",
  availability: "agenda",
  team: "team",
  documents: "dossier",
  charter: "dossier",
  payments: "subscription",
  invoices: "money",
  expenses: "money",
  accountant: "accounting",
};

/** Rubriques de « Mon profil », dans l'ordre des maquettes de la refonte (ADR 0129). */
const SECTIONS: { key: keyof typeof t.sections; rows: Row[] }[] = [
  {
    key: "profile",
    rows: [
      { key: "photo", icon: ImageIcon, tone: "primary", href: "/pro-profil-public" },
      { key: "portfolio", icon: Camera, tone: "primary", href: "/pro-profil-public" },
      { key: "reviews", icon: Star, tone: "warning", href: "/pro-avis" },
      { key: "grade", icon: Award, tone: "neutral", href: "/pro-grade" },
    ],
  },
  {
    key: "company",
    rows: [
      { key: "company", icon: Building2, tone: "success", href: "/pro-entreprise" },
      // Logo des devis, factures et DPGF (ADR 0300), déposé dans « Entreprise ».
      { key: "logo", icon: ImageIcon, tone: "neutral", href: "/pro-entreprise" },
      { key: "trades", icon: Wrench, tone: "success", href: "/pro-metiers" },
      { key: "zone", icon: MapPin, tone: "success", href: "/pro-zone" },
      { key: "availability", icon: CalendarClock, tone: "success", href: "/pro-disponibilites" },
      // Comptes d'équipe (ADR 0240) : patron d'une formule qui les inclut.
      { key: "team", icon: Users, tone: "success", href: "/pro-equipe" },
    ],
  },
  {
    key: "compliance",
    rows: [
      { key: "documents", icon: FileText, tone: "neutral", href: "/pro-documents" },
      { key: "charter", icon: ShieldCheck, tone: "neutral", href: "/pro-charte" },
    ],
  },
  {
    key: "money",
    // Paiements des clients (Stripe Connect), factures, dépenses, comptable : aucun abonnement
    // (règle 10).
    rows: [
      { key: "payments", icon: Euro, tone: "primary", href: "/pro-paiements" },
      { key: "invoices", icon: ReceiptText, tone: "primary", href: "/pro-factures" },
      { key: "expenses", icon: ShoppingCart, tone: "primary", href: "/pro-depenses" },
      { key: "accountant", icon: Send, tone: "primary", href: "/pro-comptable" },
    ],
  },
  {
    key: "account",
    rows: [
      { key: "identity", icon: UserRound, tone: "neutral", href: "/compte-reglages" },
      { key: "notifications", icon: Bell, tone: "neutral", href: "/notifications" },
      { key: "help", icon: LifeBuoy, tone: "neutral", href: "/aide" },
    ],
  },
];

/** Rubriques qui ont leurs exemples (ADR 0184). */
const EXAMPLE_ROWS: readonly Row["key"][] = ["reviews", "grade", "invoices", "expenses"];

/** Icône du bouton de la carte « Prochaine étape ». */
const TIP_ICON: Record<ProfileTip, LucideIcon> = {
  assure_verifie: FileText,
  photo_profil: Camera,
  realisations: Camera,
  presentation: PenLine,
  specialites: ListChecks,
  certifications: BadgeCheck,
};

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
 * l'état de chaque rubrique, à deux touchers au plus. Refonte « Nette » (lot 5) : en-tête à grande
 * photo, carte « Prochaine étape » avec l'anneau de la fiche, rubriques en listes façon iPhone.
 * Aucun abonnement ni lien vers le site (CLAUDE.md règle 10).
 */
export function ProfileHubScreen() {
  const [hub, reload] = useFocusData(loadProfileHub);
  if (hub === undefined) return <FicheSkeleton title={t.title} />;
  return (
    <FicheScreen title={t.title} onRefresh={reload}>
      {hub === null ? (
        <Notice tone="error">{t.loadError}</Notice>
      ) : (
        <ProfileHubContent hub={hub} onChange={reload} />
      )}
    </FicheScreen>
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
  // Exemples (ADR 0184) : « Mon profil » d'exemple ; seules les rubriques qui ont leurs exemples
  // (avis, grade, factures, fiche) s'ouvrent, les vrais réglages restent fermés.
  const example = useExamplesActive();
  // Place dans l'entreprise (ADR 0241) : un membre ne voit que ses rubriques.
  const position = hub.teamPosition ?? "patron";
  const patron = position === "patron";
  const sections = SECTIONS.map((section) => ({
    ...section,
    rows: section.rows.filter((row) => {
      const permission = ROW_PERMISSION[row.key];
      return (
        (!permission || teamCan(position, permission)) && (row.key !== "team" || Boolean(hub.team))
      );
    }),
  })).filter((section) => section.rows.length > 0);

  // Interrupteur « Afficher des données d'exemple » (ADR 0190), à tout moment : l'espace
  // s'ouvre rempli d'exemples ; à l'arrêt, « Mon profil » relit les vraies données.
  function toggleExamples(on: boolean) {
    setExamplesActive(on);
    if (on) router.dismissTo("/pro");
    else void onChange();
  }
  return (
    <>
      <Animated.View entering={enter(0)}>
        <Header hub={hub} onChange={onChange} example={example} />
      </Animated.View>
      {!patron ? null : hub.status === "brouillon" || hub.status === "refuse" ? (
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
      {patron ? (
        <>
          <Animated.View entering={enter(2)}>
            <NextStep hub={hub} example={example} />
          </Animated.View>
          <Animated.View entering={enter(3)}>
            <FicheButton
              label={t.seeProfile}
              icon={Eye}
              variant="secondary"
              onPress={() => router.push("/pro-ma-fiche")}
            />
          </Animated.View>
        </>
      ) : null}
      {patron && hub.welcomeGift ? (
        <Animated.View entering={enter(4)}>
          <WelcomeGiftCard gift={hub.welcomeGift} />
        </Animated.View>
      ) : null}
      {hub.pageUrl || hub.referral ? (
        <Animated.View entering={enter(4)}>
          <ShareCard hub={hub} />
        </Animated.View>
      ) : null}
      {sections.map((section, index) => (
        <Animated.View key={section.key} entering={enter(5 + index)} style={styles.section}>
          <Text role="heading" style={styles.sectionTitle}>
            {t.sections[section.key]}
          </Text>
          <ListGroup>
            {section.rows.map((row) => {
              const line = (
                <HubLine
                  key={row.key}
                  row={row}
                  status={statusOf(row.key, hub)}
                  detail={row.key === "identity" ? hub.email : null}
                />
              );
              return example && !EXAMPLE_ROWS.includes(row.key) ? (
                <ExampleLock key={row.key} locked>
                  {line}
                </ExampleLock>
              ) : (
                line
              );
            })}
            {patron && section.key === "account" ? (
              <ExamplesSwitch key="examples" value={example} onChange={toggleExamples} />
            ) : null}
          </ListGroup>
        </Animated.View>
      ))}
      {example ? null : (
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
      )}
      <Body muted>{fr.account.version(Constants.expoConfig?.version ?? "")}</Body>
    </>
  );
}

function statusOf(key: Row["key"], hub: ProfileHub): HubStatus {
  if (key === "team") {
    return hub.team
      ? { text: t.values.team(hub.team.used, hub.team.seats), tone: "neutral" }
      : null;
  }
  if (
    key === "identity" ||
    key === "invoices" ||
    key === "expenses" ||
    key === "accountant" ||
    key === "notifications" ||
    key === "help"
  ) {
    return null;
  }
  return hub.statuses[key];
}

/** Carré d'icône coloré de 36 px des lignes et de l'interrupteur. */
function RowIcon({ icon: Icon, tone }: { icon: LucideIcon; tone: FicheTone }) {
  const c = TAG_TONES[tone];
  return (
    <View style={[styles.rowIcon, { backgroundColor: c.bg }]}>
      <Icon size={18} color={c.fg} />
    </View>
  );
}

/**
 * Ligne d'une rubrique, façon iPhone : icône, libellé, pastille d'état, chevron. L'e-mail du
 * compte s'affiche sous « Identité et connexion ».
 */
function HubLine({ row, status, detail }: { row: Row; status: HubStatus; detail?: string | null }) {
  const label = t.rows[row.key];
  return (
    <Tappable
      role="link"
      aria-label={[label, status?.text, detail].filter(Boolean).join(", ")}
      onPress={() => router.push(row.href)}
      scaleTo={0.985}
      style={styles.row}
    >
      <RowIcon icon={row.icon} tone={row.tone} />
      <View style={styles.rowText}>
        <Text style={styles.rowLabel} numberOfLines={2}>
          {label}
        </Text>
        {detail ? (
          <Text style={styles.rowDetail} numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </View>
      {status ? (
        <View style={styles.rowStatus}>
          <FicheTag text={status.text} tone={status.tone} />
        </View>
      ) : null}
      <ChevronRight size={17} color={colors["muted-foreground"]} />
    </Tappable>
  );
}

/** « Afficher des données d'exemple » (ADR 0190), dernière ligne de « Mon compte ». */
function ExamplesSwitch({ value, onChange }: { value: boolean; onChange: (on: boolean) => void }) {
  return (
    <View style={styles.row}>
      <RowIcon icon={Eye} tone="neutral" />
      <Text style={[styles.rowLabel, styles.rowText]} numberOfLines={3}>
        {t.rows.examples}
      </Text>
      <Switch
        accessibilityLabel={t.rows.examples}
        value={value}
        onValueChange={(next) => {
          haptic.select();
          onChange(next);
        }}
        trackColor={{ true: colors.primary, false: colors["border-strong"] }}
        thumbColor={colors.surface}
      />
    </View>
  );
}

function Header({
  hub,
  onChange,
  example,
}: {
  hub: ProfileHub;
  onChange: () => Promise<void>;
  example: boolean;
}) {
  const [sending, setSending] = useState(false);

  // Photo changée d'un toucher, comme dans « Photo et présentation ».
  async function changePhoto() {
    const source = await choosePhotoSource(t.photoTitle);
    if (!source) return;
    const picked = await pickAvatar(source);
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
  const line = [hub.company, hub.trade, hub.city].filter(Boolean).join(" · ");
  return (
    <View style={styles.header}>
      <Tappable
        role="button"
        aria-label={t.changePhoto}
        onPress={changePhoto}
        disabled={sending || example}
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
          <Camera size={14} color={colors.label} />
        </View>
      </Tappable>
      <View style={styles.identity}>
        <Text role="heading" aria-level={1} style={styles.name} numberOfLines={2}>
          {hub.name}
        </Text>
        {line ? (
          <Text style={styles.company} numberOfLines={2}>
            {line}
          </Text>
        ) : null}
        {hub.verified || statusLabel || hub.gradeLevel !== null ? (
          <View style={styles.pills}>
            {hub.verified ? <FicheTag text={t.verified} tone="success" dot /> : null}
            {statusLabel ? <FicheTag text={statusLabel} tone="warning" /> : null}
            {hub.gradeLevel !== null ? (
              <FicheTag text={t.values.level(hub.gradeLevel)} tone="neutral" />
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Carte « Prochaine étape » sur fond bleu clair (refonte « Nette », lot 5) : anneau de la fiche
 * (`profileStrength`), le conseil suivant et son bouton ; « Votre fiche est complète » sinon.
 */
function NextStep({ hub, example }: { hub: ProfileHub; example: boolean }) {
  const { percent, next } = hub.strength;
  const title = next ? t.tips[next] : t.complete;
  const hint = next ? t.tipHints[next] : t.completeHint;
  return (
    <View style={styles.next}>
      <View
        accessible
        aria-label={[t.strength(percent), next ? `${t.nextStep} : ${title}` : title, hint].join(
          ". ",
        )}
        style={styles.nextHead}
      >
        <ProgressRing percent={percent} size={54} stroke={6} track={colors.surface} />
        <View style={styles.nextText}>
          {next ? <Text style={styles.nextEyebrow}>{t.nextStep.toUpperCase()}</Text> : null}
          <Text style={styles.nextTitle}>{title}</Text>
          <Text style={styles.nextHint}>{hint}</Text>
        </View>
      </View>
      {next ? (
        <FicheButton
          label={t.tipActions[next]}
          icon={TIP_ICON[next]}
          disabled={example}
          onPress={() => router.push(TIP_HREF[next])}
        />
      ) : null}
    </View>
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

const styles = StyleSheet.create({
  // Carte du cadeau de bienvenue (ADR 0154).
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
  header: { flexDirection: "row", alignItems: "center", gap: spacing(3.5) },
  avatarWrap: { width: 64, height: 64 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: "hidden",
    backgroundColor: colors["primary-soft"],
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: { width: 64, height: 64 },
  avatarBusy: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(17,23,40,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { fontFamily: font.display, fontSize: 22, color: colors.foreground },
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
  identity: { flex: 1, minWidth: 0, gap: spacing(1.5) },
  name: {
    fontFamily: font.display,
    fontSize: 28,
    lineHeight: 30,
    letterSpacing: -0.8,
    color: colors.foreground,
  },
  company: { fontFamily: font.regular, fontSize: 15, lineHeight: 20, color: colors.label },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: spacing(1.5) },
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
  // Carte « Prochaine étape » (maquette « ProfilApp »).
  next: {
    gap: spacing(4),
    padding: spacing(4),
    borderRadius: radius.card,
    backgroundColor: colors["primary-soft"],
  },
  nextHead: { flexDirection: "row", alignItems: "center", gap: spacing(3.5) },
  nextText: { flex: 1, gap: 2 },
  nextEyebrow: {
    fontFamily: font.bold,
    fontSize: 13,
    letterSpacing: 0.5,
    color: colors["primary-strong"],
  },
  nextTitle: { fontFamily: font.semibold, fontSize: 15, lineHeight: 21, color: colors.foreground },
  nextHint: { fontFamily: font.regular, fontSize: 14, lineHeight: 19, color: colors.label },
  // Rubriques en listes façon iPhone.
  section: { gap: spacing(2.5) },
  sectionTitle: {
    fontFamily: font.display,
    fontSize: 17,
    letterSpacing: -0.2,
    color: colors.foreground,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    minHeight: 60,
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(3),
    backgroundColor: colors.surface,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  rowLabel: { fontFamily: font.semibold, fontSize: 15, color: colors.foreground },
  rowDetail: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  rowStatus: { flexShrink: 1, maxWidth: "45%" },
});
