import { Redirect, Tabs } from "expo-router";
import { CalendarDays, Inbox, LayoutGrid, MessageCircle, UserRound } from "lucide-react-native";
import { useTabBarOptions } from "@/components/tab-bar";
import { fr } from "@/i18n/fr";
import { useSession } from "@/lib/session";

/**
 * Espace artisan : tableau de bord, demandes, agenda, messages et compte. Aucun lien vers
 * l'abonnement ni vers le site (CLAUDE.md règle 10).
 */
export default function ProLayout() {
  const { space } = useSession();
  const tabBarOptions = useTabBarOptions();
  if (space !== "artisan") return <Redirect href="/" />;
  return (
    <Tabs screenOptions={tabBarOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: fr.tabs.dashboard,
          tabBarIcon: ({ color, size }) => <LayoutGrid color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="demandes"
        options={{
          title: fr.tabs.requests,
          tabBarIcon: ({ color, size }) => <Inbox color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{
          title: fr.tabs.agenda,
          tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: fr.tabs.messages,
          tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="compte"
        options={{
          title: fr.tabs.account,
          tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
