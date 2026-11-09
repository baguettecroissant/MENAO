import Constants from "expo-constants";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import {
  CircleHelp,
  ClipboardList,
  FileText,
  HardHat,
  MessageCircle,
  MessageSquare,
  ShieldCheck,
} from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { PageHead } from "@/components/pro/dossier-kit";
import { FicheButton, FicheCard, FicheScreen } from "@/components/pro/fiche-kit";
import { IconSquare } from "@/components/pro/tools-kit";
import { SettingsRow, SettingsSection } from "@/components/settings-list";
import { fr } from "@/i18n/fr";
import { siteLinks } from "@/lib/env";
import { theme } from "@/ui/theme";

const { colors, font, radius, spacing } = theme;
const BENEFIT_ICONS = [ClipboardList, MessageCircle, FileText];

/**
 * Compte d'un visiteur : ce que l'espace MENAO apporte, création de compte, connexion. Refonte
 * « Nette » (lot 13) : grand titre, carte bleu clair des avantages, aide et informations légales
 * en listes façon iPhone.
 */
export function GuestAccount() {
  return (
    <FicheScreen>
      <PageHead title={fr.account.title} />
      <View style={styles.space}>
        <Text role="heading" style={styles.heading}>
          {fr.guest.spaceTitle}
        </Text>
        <Text style={styles.text}>{fr.guest.spaceText}</Text>
        <View style={styles.benefits}>
          {fr.guest.benefits.map((benefit, i) => (
            <View key={benefit} style={styles.benefit}>
              <IconSquare icon={BENEFIT_ICONS[i] ?? ClipboardList} size={34} white />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>
        <FicheButton
          label={fr.guest.createAccount}
          tall
          onPress={() => router.push("/inscription")}
        />
      </View>
      <View style={styles.signIn}>
        <Text style={styles.signInText}>{fr.guest.haveAccount}</Text>
        <FicheButton
          label={fr.guest.signIn}
          variant="secondary"
          tall
          onPress={() => router.push("/connexion")}
        />
      </View>
      <FicheCard padding={4} gap={3}>
        <View style={styles.row}>
          <IconSquare icon={HardHat} tone="dark" size={40} />
          <View style={styles.rowText}>
            <Text role="heading" style={styles.heading}>
              {fr.guest.artisanTitle}
            </Text>
            {/* Règle 10 : l'inscription pro, jamais l'abonnement (ADR 0113). */}
            <Text style={styles.text}>{fr.guest.artisanText}</Text>
          </View>
        </View>
        <FicheButton
          label={fr.guest.artisanCta}
          variant="secondary"
          onPress={() => router.push("/pro-inscription")}
        />
      </FicheCard>
      <SettingsSection title={fr.guest.helpTitle}>
        <SettingsRow
          icon={CircleHelp}
          iconTone="success"
          label={fr.guest.faq}
          onPress={() => WebBrowser.openBrowserAsync(siteLinks.faq)}
        />
        <SettingsRow
          icon={MessageSquare}
          iconTone="success"
          label={fr.guest.contact}
          onPress={() => WebBrowser.openBrowserAsync(siteLinks.contact)}
        />
      </SettingsSection>
      <SettingsSection title={fr.account.legal}>
        <SettingsRow
          icon={FileText}
          iconTone="neutral"
          label={fr.account.terms}
          onPress={() => WebBrowser.openBrowserAsync(siteLinks.terms)}
        />
        <SettingsRow
          icon={ShieldCheck}
          iconTone="neutral"
          label={fr.account.privacy}
          onPress={() => WebBrowser.openBrowserAsync(siteLinks.privacy)}
        />
      </SettingsSection>
      <Text style={styles.version}>{fr.account.version(Constants.expoConfig?.version ?? "")}</Text>
    </FicheScreen>
  );
}

const styles = StyleSheet.create({
  space: {
    gap: spacing(3),
    padding: spacing(4.5),
    borderRadius: radius.card,
    backgroundColor: colors["primary-soft"],
  },
  heading: {
    fontFamily: font.display,
    fontSize: 18,
    letterSpacing: -0.36,
    color: colors.foreground,
  },
  text: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.label },
  benefits: { gap: spacing(2.5), marginVertical: spacing(1) },
  benefit: { flexDirection: "row", alignItems: "center", gap: spacing(3) },
  benefitText: {
    flex: 1,
    fontFamily: font.semibold,
    fontSize: 15,
    lineHeight: 21,
    color: colors.foreground,
  },
  signIn: { gap: spacing(2.5) },
  signInText: {
    textAlign: "center",
    fontFamily: font.regular,
    fontSize: 14,
    color: colors["muted-foreground"],
  },
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing(3) },
  rowText: { flex: 1, gap: spacing(1) },
  version: {
    textAlign: "center",
    fontFamily: font.regular,
    fontSize: 13,
    color: colors["muted-foreground"],
  },
});
