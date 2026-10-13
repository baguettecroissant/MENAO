import { router, useLocalSearchParams } from "expo-router";
import { MailCheck } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { fr } from "@/i18n/fr";
import { closeAuth } from "@/lib/navigation";
import { Body, Button, Screen, Title } from "@/ui";
import { theme } from "@/ui/theme";

/** Après l'inscription : le lien de confirmation s'ouvre sur le site, puis on se connecte ici. */
export default function CheckEmail() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  return (
    <Screen centered>
      <View style={styles.icon}>
        <MailCheck size={28} color={theme.colors.primary} />
      </View>
      <Title>{fr.auth.checkEmailTitle}</Title>
      <Body muted>{fr.auth.checkEmailText(email ?? "")}</Body>
      <Button label={fr.auth.backToSignIn} onPress={() => router.replace("/connexion")} />
      <Button label={fr.auth.continueBrowsing} variant="secondary" onPress={closeAuth} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: theme.colors["primary-soft"],
    alignItems: "center",
    justifyContent: "center",
  },
});
