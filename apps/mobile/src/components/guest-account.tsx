import Constants from "expo-constants";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import {
  CircleQuestionMark,
  ClipboardList,
  FileText,
  HardHat,
  MessageCircle,
} from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { siteLinks } from "@/lib/env";
import { Body, Button, Card, IconTile, LinkText, Screen, Title } from "@/ui";
import { theme } from "@/ui/theme";

const BENEFIT_ICONS = [ClipboardList, MessageCircle, FileText];

/** Onglet Compte d'un visiteur : ce que l'espace MENAO apporte, création de compte, connexion. */
export function GuestAccount() {
  return (
    <Screen>
      <Title>{fr.account.title}</Title>
      <Card tone="soft">
        <Text style={styles.heading}>{fr.guest.spaceTitle}</Text>
        <Body muted>{fr.guest.spaceText}</Body>
        <View style={styles.benefits}>
          {fr.guest.benefits.map((benefit, i) => {
            const Icon = BENEFIT_ICONS[i] ?? ClipboardList;
            return (
              <View key={benefit} style={styles.benefit}>
                <View style={styles.benefitIcon}>
                  <Icon size={18} color={theme.colors.primary} />
                </View>
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            );
          })}
        </View>
        <Button label={fr.guest.createAccount} onPress={() => router.push("/inscription")} />
      </Card>
      <View style={styles.signIn}>
        <Body muted center>
          {fr.guest.haveAccount}
        </Body>
        <Button
          label={fr.guest.signIn}
          variant="secondary"
          onPress={() => router.push("/connexion")}
        />
      </View>
      <Card>
        <View style={styles.row}>
          <IconTile icon={HardHat} />
          <View style={styles.rowText}>
            <Text style={styles.heading}>{fr.guest.artisanTitle}</Text>
            {/* Règle 10 : aucun lien vers l'inscription pro ni l'abonnement [À VALIDER]. */}
            <Body muted>{fr.guest.artisanText}</Body>
          </View>
        </View>
      </Card>
      <Card>
        <View style={styles.row}>
          <IconTile icon={CircleQuestionMark} />
          <View style={styles.rowText}>
            <Text style={styles.heading}>{fr.guest.helpTitle}</Text>
            <LinkText
              label={fr.guest.faq}
              onPress={() => WebBrowser.openBrowserAsync(siteLinks.faq)}
            />
            <LinkText
              label={fr.guest.contact}
              onPress={() => WebBrowser.openBrowserAsync(siteLinks.contact)}
            />
          </View>
        </View>
      </Card>
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
      <Body muted>{fr.account.version(Constants.expoConfig?.version ?? "")}</Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { fontFamily: theme.font.medium, fontSize: 17, color: theme.colors.foreground },
  benefits: { gap: theme.spacing(3), marginVertical: theme.spacing(1) },
  benefit: { flexDirection: "row", alignItems: "center", gap: theme.spacing(3) },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitText: {
    flex: 1,
    fontFamily: theme.font.regular,
    fontSize: 15,
    color: theme.colors.foreground,
  },
  signIn: { gap: theme.spacing(3) },
  row: { flexDirection: "row", alignItems: "flex-start", gap: theme.spacing(4) },
  rowText: { flex: 1, gap: theme.spacing(2) },
});
