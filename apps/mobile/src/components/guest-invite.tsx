import { router } from "expo-router";
import type { LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { fr } from "@/i18n/fr";
import { Body, Button, IconTile, Screen, Title } from "@/ui";
import { theme } from "@/ui/theme";

/**
 * Écran d'un visiteur sur une partie réservée aux comptes (chantiers, messages, notifications) :
 * ce qu'il y trouvera, puis création de compte ou connexion.
 */
export function GuestInvite({
  icon,
  title,
  text,
  header,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  header?: ReactNode;
}) {
  return (
    <Screen centered header={header}>
      <View style={styles.illustration}>
        <IconTile icon={icon} size="lg" />
      </View>
      <Title center>{title}</Title>
      <Body muted center>
        {text}
      </Body>
      <View style={styles.actions}>
        <Button label={fr.guest.createAccount} onPress={() => router.push("/inscription")} />
        <Button
          label={fr.guest.signIn}
          variant="secondary"
          onPress={() => router.push("/connexion")}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  illustration: { alignItems: "center" },
  actions: { gap: theme.spacing(3), marginTop: theme.spacing(2) },
});
