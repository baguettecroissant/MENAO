import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { siteLinks } from "@/lib/env";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { Body, Button, Card, LinkText, Notice, Screen, Title } from "@/ui";
import { theme } from "@/ui/theme";

/**
 * Compte de l'utilisateur : identité, abonnement (artisans, sans lien d'achat), aide (particuliers
 * seulement : aucun lien vers le site pour les artisans, règle 10), légal, déconnexion.
 */
export function AccountScreen() {
  const { session, role } = useSession();
  const [leaving, setLeaving] = useState(false);
  const roleLabel =
    role === "artisan"
      ? fr.account.artisan
      : role === "artisan_en_attente"
        ? fr.account.artisanPending
        : fr.account.particulier;

  return (
    <Screen>
      <Title>{fr.account.title}</Title>
      <Card>
        <Body muted>{fr.account.signedInAs}</Body>
        <Text style={styles.email}>{session?.user.email}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{roleLabel}</Text>
        </View>
      </Card>
      {(role === "artisan" || role === "artisan_en_attente") && (
        <Card>
          <Text style={styles.heading}>{fr.account.subscription}</Text>
          {/* CLAUDE.md règle 10 : aucun bouton ni lien d'achat de l'abonnement artisan. */}
          <Notice tone="info">{fr.account.subscriptionText}</Notice>
        </Card>
      )}
      {role === "particulier" && (
        <Card>
          <Text style={styles.heading}>{fr.guest.helpTitle}</Text>
          <LinkText
            label={fr.guest.faq}
            onPress={() => WebBrowser.openBrowserAsync(siteLinks.faq)}
          />
          <LinkText
            label={fr.guest.contact}
            onPress={() => WebBrowser.openBrowserAsync(siteLinks.contact)}
          />
        </Card>
      )}
      <Card>
        <Text style={styles.heading}>{fr.account.legal}</Text>
        <LinkText
          label={fr.account.terms}
          onPress={() => WebBrowser.openBrowserAsync(siteLinks.terms)}
        />
        <LinkText
          label={fr.account.privacy}
          onPress={() => WebBrowser.openBrowserAsync(siteLinks.privacy)}
        />
      </Card>
      <Button
        label={fr.account.signOut}
        variant="secondary"
        loading={leaving}
        onPress={async () => {
          setLeaving(true);
          await supabase.auth.signOut();
          setLeaving(false);
        }}
      />
      <Body muted>{fr.account.version(Constants.expoConfig?.version ?? "")}</Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  email: { fontFamily: theme.font.medium, fontSize: 16, color: theme.colors.foreground },
  heading: { fontFamily: theme.font.medium, fontSize: 16, color: theme.colors.foreground },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: theme.colors["primary-soft"],
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: { fontFamily: theme.font.medium, fontSize: 13, color: theme.colors["primary-strong"] },
});
