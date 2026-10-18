import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import {
  Bell,
  CircleHelp,
  Download,
  FileText,
  KeyRound,
  LogOut,
  Mail,
  Megaphone,
  MessageSquare,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react-native";
import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { SettingsRow, SettingsSection, SettingsSwitch } from "@/components/settings-list";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { loadAccount, saveMarketingOptIn, shareAccountData } from "@/lib/account";
import { signOut, signOutEverywhere } from "@/lib/auth";
import { siteLinks } from "@/lib/env";
import { formatDay } from "@/lib/format";
import { useProfileSummary } from "@/lib/profile-summary";
import { useSession } from "@/lib/session";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Button, Notice, Screen, Title, toast } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.account;
const { colors, font, radius, spacing } = theme;

/**
 * Compte de l'utilisateur, comme « Mon compte » sur le site (F-08, ADR 0039 et 0083), organisé en
 * sections comme « Mon profil » (ADR 0132) : en-tête, compte (informations, e-mail, mot de passe,
 * notifications, actualités), aide (particuliers seulement : aucun lien vers le site pour les
 * artisans, règle 10), données et sécurité (export, déconnexion de tous les appareils,
 * suppression du compte, Apple 5.1.1 v), informations légales et déconnexion. Pour l'artisan,
 * c'est « Identité et connexion », ouvert depuis « Mon profil » (ADR 0129).
 */
export function AccountScreen({ title = t.title }: { title?: string }) {
  const { session, role } = useSession();
  const summary = useProfileSummary();
  const [account] = useFocusData(loadAccount);
  const [leaving, setLeaving] = useState<"here" | "everywhere" | null>(null);
  const [optIn, setOptIn] = useState<boolean | null>(null);
  const [optInError, setOptInError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportFailed, setExportFailed] = useState(false);
  const artisan = role === "artisan" || role === "artisan_en_attente";
  const roleLabel =
    role === "artisan"
      ? t.artisan
      : role === "artisan_en_attente"
        ? t.artisanPending
        : t.particulier;
  const name = [account?.firstName, account?.lastName].filter(Boolean).join(" ");
  const email = account?.email || session?.user.email || "";
  const marketing = optIn ?? account?.marketingOptIn ?? false;

  async function toggleMarketing(value: boolean) {
    setOptIn(value);
    setOptInError(null);
    const error = await saveMarketingOptIn(value);
    if (error) {
      setOptIn(!value);
      setOptInError(error);
    } else {
      toast.success(value ? t.communications.subscribed : t.communications.unsubscribed);
    }
  }

  async function exportData() {
    setExporting(true);
    setExportFailed(false);
    const shared = await shareAccountData();
    setExporting(false);
    setExportFailed(!shared);
  }

  async function leave(scope: "here" | "everywhere") {
    setLeaving(scope);
    await (scope === "everywhere" ? signOutEverywhere() : signOut());
    setLeaving(null);
  }

  return (
    <Screen header={<TopBar />}>
      <Title>{title}</Title>
      <View style={styles.header}>
        <View style={styles.avatar}>
          {summary?.avatarUrl ? (
            <Image source={{ uri: summary.avatarUrl }} style={styles.avatarImage} alt="" />
          ) : summary?.initials || name ? (
            <Text style={styles.initials}>{summary?.initials || name.charAt(0)}</Text>
          ) : (
            <UserRound size={28} color={colors["primary-foreground"]} />
          )}
        </View>
        <View style={styles.identity}>
          {name ? (
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
          ) : null}
          <Text style={styles.email} numberOfLines={1}>
            {email}
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{roleLabel}</Text>
          </View>
        </View>
      </View>

      <SettingsSection title={t.sections.account} hint={t.communications.marketingHint}>
        <SettingsRow
          icon={UserRound}
          label={t.rows.profile}
          value={name || undefined}
          href="/compte-informations"
        />
        <SettingsRow
          icon={Mail}
          label={t.rows.email}
          value={account?.pendingEmail ? t.rows.emailPending : email || undefined}
          tone={account?.pendingEmail ? "warning" : "neutral"}
          href="/compte-email"
        />
        <SettingsRow icon={KeyRound} label={t.rows.password} href="/compte-mot-de-passe" />
        <SettingsRow icon={Bell} label={t.rows.notifications} href="/notifications" />
        <SettingsSwitch
          icon={Megaphone}
          label={t.rows.marketing}
          value={marketing}
          onChange={toggleMarketing}
        />
      </SettingsSection>
      {optInError ? <Notice tone="error">{optInError}</Notice> : null}

      {artisan ? (
        // CLAUDE.md règle 10 : aucun bouton ni lien d'achat de l'abonnement artisan.
        <Notice tone="info">{t.subscriptionText}</Notice>
      ) : (
        <SettingsSection title={t.sections.help}>
          <SettingsRow
            icon={CircleHelp}
            label={fr.guest.faq}
            onPress={() => WebBrowser.openBrowserAsync(siteLinks.faq)}
          />
          <SettingsRow
            icon={MessageSquare}
            label={fr.guest.contact}
            onPress={() => WebBrowser.openBrowserAsync(siteLinks.contact)}
          />
        </SettingsSection>
      )}

      <SettingsSection title={t.sections.data} hint={t.security.signOutAllHint}>
        <SettingsRow
          icon={Download}
          label={t.rows.export}
          onPress={exportData}
          loading={exporting}
        />
        <SettingsRow
          icon={LogOut}
          label={t.rows.signOutAll}
          onPress={() => leave("everywhere")}
          loading={leaving === "everywhere"}
        />
        <SettingsRow
          icon={Trash2}
          danger
          label={t.rows.deletion}
          value={
            account?.deletionRequestedAt
              ? t.rows.deletionPending(formatDay(account.deletionRequestedAt))
              : undefined
          }
          href="/suppression-compte"
        />
      </SettingsSection>
      {exportFailed ? <Notice tone="error">{t.data.error}</Notice> : null}

      <SettingsSection title={t.legal}>
        <SettingsRow
          icon={FileText}
          label={t.terms}
          onPress={() => WebBrowser.openBrowserAsync(siteLinks.terms)}
        />
        <SettingsRow
          icon={ShieldCheck}
          label={t.privacy}
          onPress={() => WebBrowser.openBrowserAsync(siteLinks.privacy)}
        />
      </SettingsSection>

      <Button
        label={t.signOut}
        variant="danger"
        loading={leaving === "here"}
        disabled={leaving !== null}
        onPress={() => leave("here")}
      />
      <Body muted>{t.version(Constants.expoConfig?.version ?? "")}</Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: spacing(4) },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: "hidden",
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: { width: 64, height: 64 },
  initials: { fontFamily: font.bold, fontSize: 22, color: colors["primary-foreground"] },
  identity: { flex: 1, gap: 2 },
  name: { fontFamily: font.bold, fontSize: 19, color: colors.foreground },
  email: { fontFamily: font.regular, fontSize: 14, color: colors["muted-foreground"] },
  badge: {
    alignSelf: "flex-start",
    marginTop: spacing(1),
    backgroundColor: colors["primary-soft"],
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: { fontFamily: font.medium, fontSize: 12, color: colors["primary-strong"] },
});
