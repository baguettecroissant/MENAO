import { Redirect, router, Tabs } from "expo-router";
import {
  ClipboardList,
  Files,
  House,
  LayoutGrid,
  MessageCircle,
  Search,
} from "lucide-react-native";
import { CenterTabButton } from "@/components/center-tab-button";
import { useTabBarOptions } from "@/components/tab-bar";
import { fr } from "@/i18n/fr";
import { useSession } from "@/lib/session";
import { useUnread } from "@/lib/unread";
import { theme } from "@/ui/theme";

/**
 * Espace client, ouvert sans compte (ADR 0055), barre d'onglets de la maquette « Mes chantiers -
 * Mobile » (ADR 0084) : tableau de bord, chantiers, (loupe) nouvelle recherche, documents,
 * messages. Le compte s'ouvre depuis la photo de l'en-tête. Un artisan ou un membre de l'équipe
 * qui se connecte est renvoyé vers son espace.
 */
export default function ClientLayout() {
  const { space, signedIn } = useSession();
  const { messages } = useUnread();
  const tabBarOptions = useTabBarOptions();
  if (space === "artisan") return <Redirect href="/pro" />;
  if (space === "equipe") return <Redirect href="/equipe" />;
  return (
    <Tabs screenOptions={tabBarOptions}>
      <Tabs.Screen
        name="accueil"
        options={{
          // Libellé court sous l'icône : l'écran s'appelle « Tableau de bord » une fois connecté.
          title: fr.tabs.home,
          tabBarIcon: ({ color, size }) =>
            signedIn ? (
              <LayoutGrid color={color} size={size} />
            ) : (
              <House color={color} size={size} />
            ),
        }}
      />
      <Tabs.Screen
        name="chantiers"
        options={{
          title: fr.tabs.chantiers,
          tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="nouvelle-recherche"
        options={{
          title: fr.tabs.search,
          tabBarButton: () => (
            <CenterTabButton
              icon={Search}
              label={fr.tabs.search}
              onPress={() => router.push("/recherche")}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: fr.tabs.documents,
          tabBarIcon: ({ color, size }) => <Files color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: fr.tabs.messages,
          tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />,
          // Messages non lus (F-40), comme la pastille de « Mon espace » sur le site.
          tabBarBadge: messages > 0 ? messages : undefined,
          tabBarBadgeStyle: { backgroundColor: theme.colors.primary, fontSize: 11 },
          tabBarAccessibilityLabel:
            messages > 0 ? `${fr.tabs.messages}, ${fr.messages.unread(messages)}` : undefined,
        }}
      />
    </Tabs>
  );
}
