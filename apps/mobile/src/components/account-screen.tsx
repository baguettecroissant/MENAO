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
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { PageHead } from "@/components/pro/dossier-kit";
import { FicheScreen, FicheTag } from "@/components/pro/fiche-kit";
import { SettingsRow, SettingsSection, SettingsSwitch } from "@/components/settings-list";
import { fr } from "@/i18n/fr";
import { loadAccount, saveMarketingOptIn, shareAccountData } from "@/lib/account";
import { signOut, signOutEverywhere } from "@/lib/auth";
import { siteLinks } from "@/lib/env";
import { formatDay } from "@/lib/format";
import { useProfileSummary } from "@/lib/profile-summary";
import { useSession } from "@/lib/session";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice, toast } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.account;
const { colors, font, radius, spacing } = theme;

/**
 * Compte de l'utilisateur, comme « Mon compte » sur le site (F-08, ADR 0039 et 0083), organisé en
 * sections comme « Mon profil » (ADR 0132) : en-tête, compte (informations, e-mail, mot de passe,
 * notifications, actualités), aide (particuliers seulement : aucun lien vers le site pour les
 * artisans, règle 10), données et sécurité (export, déconnexion de tous les appareils,
 * suppression du compte, Apple 5.1.1 v), informations légales et déconnexion. Pour l'artisan,
 * c'est « Identité et connexion », ouvert depuis « Mon profil » (ADR 0129). Refonte « Nette »
 * (lot 13, maquette « CompteApp ») : grand titre, carte d'identité, rubriques en listes façon
 * iPhone (carrés d'icône colorés), « Me déconnecter » en rouge centré.
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
    <FicheScreen>
      <PageHead title={title} />
      <View style={styles.identity}>
        <View style={styles.avatar}>
          {summary?.avatarUrl ? (
            <Image source={{ uri: summary.avatarUrl }} style={styles.avatarImage} alt="" />
          ) : summary?.initials || name ? (
            <Text style={styles.initials}>{summary?.initials || name.charAt(0)}</Text>
          ) : (
            <UserRound size={26} color={colors["primary-foreground"]} />
          )}
        </View>
        <View style={styles.identityText}>
          {name ? (
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
          ) : null}
          <Text style={styles.email} numberOfLines={1}>
            {email}
          </Text>
          <View style={styles.badge}>
            <FicheTag text={roleLabel} tone="primary" />
          </View>
        </View>
      </View>

      <SettingsSection>
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
      </SettingsSection>

      <SettingsSection hint={t.communications.marketingHint}>
        <SettingsRow
          icon={Bell}
          iconTone="warning"
          label={t.rows.notifications}
          href="/notifications"
        />
        <SettingsSwitch
          icon={Megaphone}
          iconTone="warning"
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
        <SettingsSection>
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
      )}

      <SettingsSection hint={t.security.signOutAllHint}>
        <SettingsRow
          icon={Download}
          iconTone="neutral"
          label={t.rows.export}
          onPress={exportData}
          loading={exporting}
        />
        <SettingsRow
          icon={LogOut}
          iconTone="neutral"
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

      <SettingsSection>
        <SettingsRow
          icon={FileText}
          iconTone="neutral"
          label={t.terms}
          onPress={() => WebBrowser.openBrowserAsync(siteLinks.terms)}
        />
        <SettingsRow
          icon={ShieldCheck}
          iconTone="neutral"
          label={t.privacy}
          onPress={() => WebBrowser.openBrowserAsync(siteLinks.privacy)}
        />
      </SettingsSection>

      <Pressable
        role="button"
        aria-label={t.signOut}
        aria-busy={leaving === "here"}
        aria-disabled={leaving !== null}
        disabled={leaving !== null}
        hitSlop={6}
        onPress={() => leave("here")}
        style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}
      >
        {leaving === "here" ? (
          <ActivityIndicator color={colors.danger} />
        ) : (
          <Text style={[styles.signOutText, leaving !== null && styles.disabled]}>{t.signOut}</Text>
        )}
      </Pressable>
      <Text style={styles.version}>{t.version(Constants.expoConfig?.version ?? "")}</Text>
    </FicheScreen>
  );
}

const styles = StyleSheet.create({
  // Carte d'identité (maquette « CompteApp ») : avatar bleu nuit, nom, e-mail.
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: spacing(4),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: colors.foreground,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: { width: 56, height: 56 },
  initials: { fontFamily: font.bold, fontSize: 19, color: colors["primary-foreground"] },
  identityText: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontFamily: font.display, fontSize: 19, letterSpacing: -0.4, color: colors.foreground },
  email: { fontFamily: font.regular, fontSize: 14, color: colors["muted-foreground"] },
  badge: { marginTop: spacing(1) },
  signOut: {
    alignSelf: "center",
    minHeight: theme.touchTarget,
    justifyContent: "center",
    paddingHorizontal: spacing(4),
  },
  signOutText: { fontFamily: font.semibold, fontSize: 15, color: colors.danger },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.5 },
  version: {
    textAlign: "center",
    fontFamily: font.regular,
    fontSize: 13,
    color: colors["muted-foreground"],
  },
});
