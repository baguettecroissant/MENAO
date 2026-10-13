import { Redirect, Tabs } from "expo-router";
import { Bell, ClipboardList, MessageCircle, UserRound } from "lucide-react-native";
import { tabBarOptions } from "@/components/tab-bar";
import { fr } from "@/i18n/fr";
import { useSession } from "@/lib/session";

/** Espace particulier : chantiers, messages, notifications et compte. */
export default function ParticulierLayout() {
  const { space } = useSession();
  if (space !== "particulier") return <Redirect href="/" />;
  return (
    <Tabs screenOptions={tabBarOptions}>
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
        name="notifications"
        options={{
          title: fr.tabs.notifications,
          tabBarIcon: ({ color, size }) => <Bell color={color} size={size} />,
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
