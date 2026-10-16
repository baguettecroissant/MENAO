import { Redirect, Tabs } from "expo-router";
import { ClipboardList, FileText, LayoutGrid, MessageCircle, Plus } from "lucide-react-native";
import { useEffect, useState } from "react";
import { CenterTabButton } from "@/components/center-tab-button";
import { QuickActions } from "@/components/pro/quick-actions";
import { useTabBarOptions } from "@/components/tab-bar";
import { fr } from "@/i18n/fr";
import { charterRequired } from "@/lib/charter";
import { useSession } from "@/lib/session";
import { useUnread } from "@/lib/unread";
import { theme } from "@/ui/theme";

/**
 * Espace artisan, barre d'onglets des maquettes et de la spec (F-16, ADR 0084) : tableau de bord,
 * chantiers, (+) actions rapides, devis, messages. Demandes et agenda s'ouvrent depuis le tableau
 * de bord, le compte depuis la photo de l'en-tête. Aucun lien vers l'abonnement ni vers le site
 * (CLAUDE.md règle 10). Charte qualité en vigueur signée d'abord (ADR 0109), comme sur le site.
 */
export default function ProLayout() {
  const { space } = useSession();
  const { messages } = useUnread();
  const tabBarOptions = useTabBarOptions();
  const [actions, setActions] = useState(false);
  const [charter, setCharter] = useState<"a_verifier" | "a_signer" | "ok">("a_verifier");
  useEffect(() => {
    if (space !== "artisan") return;
    let active = true;
    charterRequired()
      .then((required) => active && setCharter(required ? "a_signer" : "ok"))
      .catch(() => active && setCharter("ok"));
    return () => {
      active = false;
    };
  }, [space]);
  if (space !== "artisan") return <Redirect href="/" />;
  if (charter === "a_signer") return <Redirect href="/pro-charte" />;
  return (
    <>
      <Tabs screenOptions={tabBarOptions}>
        <Tabs.Screen
          name="index"
          options={{
            title: fr.tabs.home,
            tabBarIcon: ({ color, size }) => <LayoutGrid color={color} size={size} />,
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
          name="nouveau"
          options={{
            title: fr.tabs.quickActions,
            tabBarButton: () => (
              <CenterTabButton
                icon={Plus}
                label={fr.tabs.quickActions}
                onPress={() => setActions(true)}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="devis"
          options={{
            title: fr.tabs.quotes,
            tabBarIcon: ({ color, size }) => <FileText color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: fr.tabs.messages,
            tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />,
            tabBarBadge: messages > 0 ? messages : undefined,
            tabBarBadgeStyle: { backgroundColor: theme.colors.primary, fontSize: 11 },
            tabBarAccessibilityLabel:
              messages > 0 ? `${fr.tabs.messages}, ${fr.messages.unread(messages)}` : undefined,
          }}
        />
      </Tabs>
      <QuickActions open={actions} onClose={() => setActions(false)} />
    </>
  );
}
