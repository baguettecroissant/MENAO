import { Redirect } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { BriefcaseBusiness, Monitor } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { fr } from "@/i18n/fr";
import { env } from "@/lib/env";
import { useSession } from "@/lib/session";
import { signOut } from "@/lib/auth";
import { Body, Button, Screen, Title } from "@/ui";
import { theme } from "@/ui/theme";

/**
 * Équipe MENAO : le back-office reste sur le site, depuis un ordinateur. Commerciaux (ADR 0205) :
 * leur espace est sur le site, ouvert dans le navigateur du téléphone.
 */
export default function Equipe() {
  const { space, role } = useSession();
  const [leaving, setLeaving] = useState(false);
  if (space !== "equipe") return <Redirect href="/" />;
  const commercial = role === "commercial";
  const Icon = commercial ? BriefcaseBusiness : Monitor;
  return (
    <Screen centered>
      <View style={styles.icon}>
        <Icon size={28} color={theme.colors.primary} />
      </View>
      <Title>{commercial ? fr.staff.commercialTitle : fr.staff.title}</Title>
      <Body muted>{commercial ? fr.staff.commercialText : fr.staff.text}</Body>
      {commercial ? (
        <Button
          label={fr.staff.commercialOpen}
          onPress={() => WebBrowser.openBrowserAsync(`${env.siteUrl}/commercial`)}
        />
      ) : null}
      <Button
        label={fr.account.signOut}
        variant="secondary"
        loading={leaving}
        onPress={async () => {
          setLeaving(true);
          await signOut();
          setLeaving(false);
        }}
      />
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
