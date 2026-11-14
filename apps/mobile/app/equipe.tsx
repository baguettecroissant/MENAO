import { Redirect } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { BriefcaseBusiness, ExternalLink, Monitor } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { FicheButton } from "@/components/pro/fiche-kit";
import { fr } from "@/i18n/fr";
import { env } from "@/lib/env";
import { useSession } from "@/lib/session";
import { signOut } from "@/lib/auth";
import { Button, Screen } from "@/ui";
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
  // Refonte « Nette » (lot 49, ADR 0318) : une carte au centre, la déconnexion dessous.
  return (
    <Screen centered>
      <View style={styles.card}>
        <View style={styles.icon}>
          <Icon size={30} color={theme.colors["primary-strong"]} />
        </View>
        <Text role="heading" style={styles.title}>
          {commercial ? fr.staff.commercialTitle : fr.staff.title}
        </Text>
        <Text style={styles.text}>{commercial ? fr.staff.commercialText : fr.staff.text}</Text>
        {commercial ? (
          <FicheButton
            label={fr.staff.commercialOpen}
            icon={ExternalLink}
            tall
            onPress={() => void WebBrowser.openBrowserAsync(`${env.siteUrl}/commercial`)}
          />
        ) : null}
      </View>
      <Button
        label={fr.account.signOut}
        variant="ghost"
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
  card: {
    gap: theme.spacing(3.5),
    padding: theme.spacing(6),
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: "stretch",
  },
  icon: {
    alignSelf: "center",
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: theme.colors["primary-soft"],
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: theme.font.display,
    fontSize: 24,
    letterSpacing: -0.48,
    color: theme.colors.foreground,
    textAlign: "center",
  },
  text: {
    fontFamily: theme.font.regular,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.label,
    textAlign: "center",
  },
});
