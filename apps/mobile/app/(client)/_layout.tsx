import { Redirect, Tabs } from "expo-router";
import { ClipboardList, House, MessageCircle, UserRound } from "lucide-react-native";
import { useTabBarOptions } from "@/components/tab-bar";
import { fr } from "@/i18n/fr";
import { useSession } from "@/lib/session";

/**
 * Espace client, ouvert sans compte : accueil, chantiers, messages et compte (ADR 0055). Un
 * artisan ou un membre de l'équipe qui se connecte est renvoyé vers son espace.
 */
export default function ClientLayout() {
  const { space } = useSession();
  const tabBarOptions = useTabBarOptions();
  if (space === "artisan") return <Redirect href="/pro" />;
  if (space === "equipe") return <Redirect href="/equipe" />;
  return (
    <Tabs screenOptions={tabBarOptions}>
      <Tabs.Screen
        name="accueil"
        options={{
          title: fr.tabs.home,
          tabBarIcon: ({ color, size }) => <House color={color} size={size} />,
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
