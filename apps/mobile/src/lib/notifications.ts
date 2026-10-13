import { emailPreferences, type EmailPreferences } from "@menao/core";
import { notificationContent, type NotificationType } from "@menao/emails/content";
import { fr } from "@/i18n/fr";
import { supabase } from "./supabase";

export type NotificationItem = {
  id: string;
  title: string;
  preview: string;
  /** Page concernée sur le site (chemin relatif), comme le bouton de l'e-mail. */
  link: string;
  createdAt: string;
  unread: boolean;
};

/**
 * Centre de notifications (F-41), avec les mêmes textes que les e-mails (`@menao/emails`) :
 * objet, aperçu et lien vers la page concernée.
 */
export async function loadNotifications(): Promise<NotificationItem[] | null> {
  const { data, error } = await supabase.rpc("my_notifications", { p_limit: 50 });
  if (error) return null;
  return (data ?? []).map((n) => {
    const content = notificationContent(
      n.type as NotificationType,
      (n.data ?? {}) as Record<string, unknown>,
      { siteUrl: "", firstName: null },
    );
    return {
      id: n.notification_id,
      title: content.subject,
      preview: content.preview,
      link: content.cta.url || "/",
      createdAt: n.created_at,
      unread: n.read_at === null,
    };
  });
}

/** Centre affiché : toutes les notifications sont marquées lues (elles restent signalées à l'écran). */
export async function markNotificationsRead(): Promise<void> {
  await supabase.rpc("mark_notifications_read", {});
}

/** Préférences d'e-mail (F-41) : activité du chantier et rappels, désactivables. */
export async function loadEmailPreferences(userId: string): Promise<EmailPreferences> {
  const { data } = await supabase
    .from("profiles")
    .select("notification_preferences")
    .eq("user_id", userId)
    .maybeSingle();
  return emailPreferences(data?.notification_preferences);
}

export async function saveEmailPreferences(prefs: EmailPreferences): Promise<string | null> {
  const { error } = await supabase.rpc("set_notification_preferences", {
    p_activite: prefs.activite,
    p_rappels: prefs.rappels,
  });
  return error ? fr.errors.generic : null;
}
