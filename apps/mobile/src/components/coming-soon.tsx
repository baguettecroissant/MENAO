import * as WebBrowser from "expo-web-browser";
import type { LucideIcon } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { fr } from "@/i18n/fr";
import { env } from "@/lib/env";
import { Body, Button, Card, Screen, Title } from "@/ui";
import { theme } from "@/ui/theme";

/**
 * Écran d'attente d'un onglet dont le contenu arrive dans un lot suivant de la phase 6. Le lien
 * vers le site n'est proposé qu'aux particuliers (règle 10 : rien qui mène à l'achat de
 * l'abonnement artisan dans l'application).
 */
export function ComingSoon({
  icon: Icon,
  title,
  text,
  siteLink = false,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  siteLink?: boolean;
}) {
  return (
    <Screen>
      <Title>{title}</Title>
      <Card>
        <View style={styles.icon}>
          <Icon size={22} color={theme.colors.primary} />
        </View>
        <Body>{fr.soon.title}</Body>
        <Body muted>{text}</Body>
        {siteLink && (
          <>
            <Body muted>{fr.soon.web}</Body>
            <Button
              label={fr.brand}
              variant="secondary"
              onPress={() => WebBrowser.openBrowserAsync(env.siteUrl)}
            />
          </>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors["primary-soft"],
    alignItems: "center",
    justifyContent: "center",
  },
});
