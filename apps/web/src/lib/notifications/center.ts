import "server-only";
import { notificationContent, type NotificationType } from "@menao/emails/content";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export type CenterItem = {
  id: string;
  title: string;
  preview: string;
  /** Page concernée (chemin relatif), comme le bouton de l'e-mail. */
  href: string;
  createdAt: string;
  unread: boolean;
};

/**
 * Notifications de l'utilisateur (F-41), avec les mêmes textes que les e-mails (packages/emails) :
 * objet, aperçu et lien vers la page concernée.
 */
export async function loadNotifications(supabase: Client): Promise<CenterItem[]> {
  const { data } = await supabase.rpc("my_notifications", { p_limit: 50 });
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
      href: content.cta.url || "/",
      createdAt: n.created_at,
      unread: n.read_at === null,
    };
  });
}
