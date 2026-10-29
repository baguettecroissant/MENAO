import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect } from "react";
import { appRouteForSitePath } from "@/lib/links";
import { isVisibleConversationLink, pushSupported, registerDevice } from "@/lib/push";
import { useSession } from "@/lib/session";
import { useUnread } from "@/lib/unread";

// Au premier plan, la notification s'affiche aussi (bannière et son), sauf le message d'une
// conversation déjà à l'écran (ADR 0201).
if (pushSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const shown = !isVisibleConversationLink(notification.request.content.data?.link);
      return {
        shouldShowBanner: shown,
        shouldShowList: shown,
        shouldPlaySound: shown,
        shouldSetBadge: false,
      };
    },
  });
}

/** Écran concerné par la notification touchée (lien de l'e-mail), sinon le centre de notifications. */
function openNotification(response: Notifications.NotificationResponse) {
  const link = response.notification.request.content.data?.link;
  const route = typeof link === "string" ? appRouteForSitePath(link) : null;
  router.push(route ?? "/notifications");
}

/**
 * Notifications push (F-41, ADR 0079) : appareil enregistré à chaque ouverture par un compte
 * connecté, compteurs de non-lus rafraîchis à la réception, écran concerné ouvert au toucher
 * (application fermée comprise).
 */
export function PushNotifications() {
  const { signedIn, session } = useSession();
  const { refresh } = useUnread();
  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (signedIn && userId) void registerDevice();
  }, [signedIn, userId]);

  useEffect(() => {
    if (!pushSupported) return;
    const last = Notifications.getLastNotificationResponse();
    if (last) {
      Notifications.clearLastNotificationResponse();
      openNotification(last);
    }
    const tapped = Notifications.addNotificationResponseReceivedListener(openNotification);
    const received = Notifications.addNotificationReceivedListener(() => refresh());
    return () => {
      tapped.remove();
      received.remove();
    };
  }, [refresh]);

  return null;
}
