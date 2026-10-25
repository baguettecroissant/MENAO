import { Redirect, Tabs } from "expo-router";
import { ClipboardList, Inbox, LayoutGrid, Wallet } from "lucide-react-native";
import { useEffect, useState } from "react";
import { CenterTabButton } from "@/components/center-tab-button";
import { QuickActions } from "@/components/pro/quick-actions";
import { useTabBarOptions } from "@/components/tab-bar";
import { fr } from "@/i18n/fr";
import { haptic } from "@/lib/haptics";
import { charterRequired } from "@/lib/charter";
import { useSession } from "@/lib/session";
import { useUnread } from "@/lib/unread";
import { theme } from "@/ui/theme";

/**
 * Espace artisan (F-16, ADR 0084, 0130 puis 0188) : accueil « À faire maintenant », demandes (72 h
 * pour répondre, avec leur pastille), (+) actions rapides, chantiers, argent (devis, factures,
 * dépenses). Les messages s'ouvrent depuis l'en-tête.
 * L'agenda s'ouvre depuis l'accueil et le (+), « Mon profil » depuis la photo de l'en-tête. Aucun
 * lien vers l'abonnement ni vers le site (CLAUDE.md règle 10). Charte qualité en vigueur signée
 * d'abord (ADR 0109), comme sur le site.
 */
export default function ProLayout() {
  const { space } = useSession();
  const { requests } = useUnread();
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
      <Tabs screenOptions={tabBarOptions} screenListeners={{ tabPress: () => haptic.select() }}>
        <Tabs.Screen
          name="index"
          options={{
            title: fr.tabs.home,
            tabBarIcon: ({ color, size }) => <LayoutGrid color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="demandes"
          options={{
            title: fr.tabs.requests,
            tabBarIcon: ({ color, size }) => <Inbox color={color} size={size} />,
            tabBarBadge: requests > 0 ? requests : undefined,
            tabBarBadgeStyle: { backgroundColor: theme.colors.danger, fontSize: 11 },
            tabBarAccessibilityLabel:
              requests > 0 ? `${fr.tabs.requests}, ${fr.tabs.requestsBadge(requests)}` : undefined,
          }}
        />
        <Tabs.Screen
          name="nouveau"
          options={{
            title: fr.tabs.quickActions,
            tabBarButton: () => (
              <CenterTabButton
                brand
                label={fr.tabs.quickActions}
                onPress={() => setActions(true)}
              />
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
          name="argent"
          options={{
            title: fr.tabs.money,
            tabBarIcon: ({ color, size }) => <Wallet color={color} size={size} />,
          }}
        />
        {/* Ancien onglet « Devis » : renvoie vers l'onglet Argent (ADR 0188). */}
        <Tabs.Screen name="devis" options={{ href: null }} />
        {/* Messages : icône de l'en-tête, avec leur pastille (ADR 0188). */}
        <Tabs.Screen name="messages" options={{ href: null }} />
      </Tabs>
      <QuickActions open={actions} onClose={() => setActions(false)} />
    </>
  );
}
