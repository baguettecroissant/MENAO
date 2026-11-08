import type { EmailPreferences } from "@menao/core";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import {
  Bell,
  CalendarCheck,
  Camera,
  FileText,
  MessageSquare,
  Star,
  TriangleAlert,
  Wallet,
  type LucideIcon,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { EmptyState } from "@/components/empty-state";
import {
  CardHeading,
  FicheButton,
  FicheCard,
  FicheScreen,
  FicheSkeleton,
  type FicheTone,
} from "@/components/pro/fiche-kit";
import { CheckRow, IconSquare } from "@/components/pro/tools-kit";
import { fr } from "@/i18n/fr";
import { env } from "@/lib/env";
import { formatAgo, isParisToday } from "@/lib/format";
import { appRouteForSitePath } from "@/lib/links";
import {
  loadEmailPreferences,
  loadNotifications,
  markNotificationsRead,
  saveEmailPreferences,
  type NotificationItem,
} from "@/lib/notifications";
import { useSession } from "@/lib/session";
import { useUnread } from "@/lib/unread";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice, Tappable, toast } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.notificationCenter;
const { colors, font, radius, spacing } = theme;

/**
 * Ouvre l'écran concerné dans l'application, sinon la page du site (contact…). Jamais de renvoi
 * vers le site pour un artisan (règle 10) : la notification reste alors affichée ici.
 */
function open(item: NotificationItem, artisan: boolean) {
  const route = appRouteForSitePath(item.link);
  if (route) router.push(route);
  else if (!artisan) WebBrowser.openBrowserAsync(`${env.siteUrl}${item.link}`);
}

/**
 * Carré d'icône d'une notification, d'après des mots de son type (maquette « NotificationsApp ») :
 * alerte en rouge, devis en bleu, message en gris, rendez-vous en vert, argent en orange.
 */
const ICONS: readonly { words: readonly string[]; icon: LucideIcon; tone: FicheTone }[] = [
  {
    words: ["litige", "refuse", "suspendu", "radie", "impaye", "annule", "sans_reponse"],
    icon: TriangleAlert,
    tone: "danger",
  },
  { words: ["devis"], icon: FileText, tone: "primary" },
  { words: ["message", "support", "contact", "secretaire"], icon: MessageSquare, tone: "neutral" },
  {
    words: ["rdv", "creneau", "demarrage", "planifie", "planning"],
    icon: CalendarCheck,
    tone: "success",
  },
  { words: ["acompte", "solde", "paiement", "abonnement"], icon: Wallet, tone: "warning" },
  { words: ["nouveautes"], icon: Camera, tone: "neutral" },
  { words: ["avis", "badge", "niveau"], icon: Star, tone: "warning" },
];

function iconOf(type: string): { icon: LucideIcon; tone: FicheTone } {
  return (
    ICONS.find((entry) => entry.words.some((word) => type.includes(word))) ?? {
      icon: Bell,
      tone: "primary",
    }
  );
}

/**
 * Centre de notifications (F-41), comme sur le site : mêmes textes que les e-mails, non lues
 * signalées pendant la visite (toutes sont marquées lues à l'affichage), préférences d'e-mail.
 * Refonte « Nette » (lot 13, maquette « NotificationsApp ») : groupes « Aujourd'hui » et
 * « Plus tôt » en cartes, carré d'icône coloré, titre en gras et point bleu si non lue.
 */
export function NotificationCenter() {
  const { refresh } = useUnread();
  const artisan = useSession().space === "artisan";
  const [items, reload] = useFocusData(loadNotifications);

  useEffect(() => {
    if (items) markNotificationsRead().then(refresh);
  }, [items, refresh]);

  if (items === undefined) return <FicheSkeleton title={t.title} />;
  const now = new Date();
  const today = items?.filter((item) => isParisToday(item.createdAt, now)) ?? [];
  const earlier = items?.filter((item) => !isParisToday(item.createdAt, now)) ?? [];
  return (
    <FicheScreen title={t.title} onRefresh={reload}>
      <Text style={styles.lead}>{t.subtitle}</Text>
      {items === null ? (
        <Notice tone="error">{t.error}</Notice>
      ) : items.length === 0 ? (
        <EmptyState illustration="notifications">{t.empty}</EmptyState>
      ) : (
        <>
          {today.length > 0 ? (
            <NotificationGroup title={t.today} items={today} now={now} artisan={artisan} />
          ) : null}
          {earlier.length > 0 ? (
            <NotificationGroup title={t.earlier} items={earlier} now={now} artisan={artisan} />
          ) : null}
        </>
      )}
      <Preferences />
    </FicheScreen>
  );
}

/** Un groupe de notifications : carte blanche, titre (Inter Tight), puis ses lignes. */
function NotificationGroup({
  title,
  items,
  now,
  artisan,
}: {
  title: string;
  items: NotificationItem[];
  now: Date;
  artisan: boolean;
}) {
  return (
    <View style={styles.group}>
      <Text role="heading" style={styles.groupTitle}>
        {title}
      </Text>
      {items.map((item) => {
        const { icon, tone } = iconOf(item.type);
        const when = formatAgo(item.createdAt, now);
        return (
          <Tappable
            key={item.id}
            role="link"
            aria-label={[item.title, item.preview, when, item.unread ? t.unread : null]
              .filter(Boolean)
              .join(", ")}
            onPress={() => open(item, artisan)}
            scaleTo={0.985}
            style={styles.item}
          >
            <IconSquare icon={icon} tone={tone} size={38} />
            <View style={styles.itemText}>
              <View style={styles.itemHead}>
                <Text style={[styles.itemTitle, item.unread && styles.itemTitleUnread]}>
                  {item.title}
                </Text>
                <Text style={styles.time}>{when}</Text>
              </View>
              <Text style={styles.preview}>{item.preview}</Text>
            </View>
            {item.unread ? <View style={styles.dot} /> : null}
          </Tappable>
        );
      })}
    </View>
  );
}

/** Préférences d'e-mail (F-41) : activité du chantier et rappels, désactivables. */
function Preferences() {
  const { session } = useSession();
  const userId = session?.user.id ?? "";
  const load = useCallback(() => loadEmailPreferences(userId), [userId]);
  const [initial] = useFocusData(load);
  const [edited, setEdited] = useState<EmailPreferences | null>(null);
  const [status, setStatus] = useState<"error" | null>(null);
  const [pending, setPending] = useState(false);
  const prefs = edited ?? initial;
  if (!prefs) return null;

  async function save() {
    if (!prefs) return;
    setStatus(null);
    setPending(true);
    const failed = await saveEmailPreferences(prefs);
    setPending(false);
    setStatus(failed ? "error" : null);
    if (!failed) toast.success(t.saved);
  }

  return (
    <FicheCard padding={4} gap={2.5}>
      <CardHeading title={t.prefsTitle} size={17} />
      <Text style={styles.prefsIntro}>{t.prefsIntro}</Text>
      {(["activite", "rappels"] as const).map((key) => (
        <CheckRow
          key={key}
          label={t[key]}
          checked={prefs[key]}
          onChange={(value) => {
            setEdited({ ...prefs, [key]: value });
            setStatus(null);
          }}
        />
      ))}
      {status === "error" ? <Notice tone="error">{fr.errors.generic}</Notice> : null}
      <FicheButton label={t.save} variant="secondary" onPress={save} loading={pending} />
    </FicheCard>
  );
}

const styles = StyleSheet.create({
  lead: { fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: colors.label },
  group: {
    overflow: "hidden",
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  groupTitle: {
    paddingHorizontal: 14,
    paddingTop: spacing(3),
    paddingBottom: spacing(2),
    fontFamily: font.display,
    fontSize: 16,
    letterSpacing: -0.3,
    color: colors.foreground,
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing(3),
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  itemText: { flex: 1, minWidth: 0, gap: 2 },
  itemHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: spacing(2),
  },
  itemTitle: {
    flex: 1,
    fontFamily: font.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.foreground,
  },
  itemTitleUnread: { fontFamily: font.bold },
  time: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
  preview: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginTop: 6,
    backgroundColor: colors.primary,
    flexShrink: 0,
  },
  prefsIntro: {
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors["muted-foreground"],
  },
});
