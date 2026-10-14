import Constants from "expo-constants";
import { router, type Href } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { ChevronRight } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { loadAccount, saveMarketingOptIn, shareAccountData } from "@/lib/account";
import { siteLinks } from "@/lib/env";
import { formatDay } from "@/lib/format";
import { useSession } from "@/lib/session";
import { signOut, signOutEverywhere } from "@/lib/auth";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Button, Card, Checkbox, LinkText, Notice, Screen, Title } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.account;
const { colors, font, radius, spacing } = theme;

/** Ligne des paramètres : intitulé, détail, chevron ; ouvre l'écran correspondant. */
function SettingsRow({ label, detail, href }: { label: string; detail?: string; href: Href }) {
  return (
    <Pressable
      role="link"
      aria-label={label}
      onPress={() => router.push(href)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {detail ? (
          <Text style={styles.rowDetail} numberOfLines={2}>
            {detail}
          </Text>
        ) : null}
      </View>
      <ChevronRight size={18} color={colors["muted-foreground"]} />
    </Pressable>
  );
}

/**
 * Compte de l'utilisateur, comme « Mon compte » sur le site (F-08, ADR 0039 et 0083) :
 * informations, adresse e-mail, mot de passe, communications, export des données, suppression du
 * compte (Apple 5.1.1 v), déconnexion de tous les appareils. S'y ajoutent l'abonnement (artisans,
 * sans lien d'achat), l'aide (particuliers seulement : aucun lien vers le site pour les artisans,
 * règle 10), le légal et la déconnexion.
 */
export function AccountScreen() {
  const { session, role } = useSession();
  const [account] = useFocusData(loadAccount);
  const [leaving, setLeaving] = useState<"here" | "everywhere" | null>(null);
  const [optIn, setOptIn] = useState<boolean | null>(null);
  const [optInNotice, setOptInNotice] = useState<{ tone: "success" | "error"; text: string }>();
  const [exporting, setExporting] = useState(false);
  const [exportFailed, setExportFailed] = useState(false);
  const roleLabel =
    role === "artisan"
      ? t.artisan
      : role === "artisan_en_attente"
        ? t.artisanPending
        : t.particulier;
  const name = [account?.firstName, account?.lastName].filter(Boolean).join(" ");
  const marketing = optIn ?? account?.marketingOptIn ?? false;

  async function toggleMarketing(value: boolean) {
    setOptIn(value);
    setOptInNotice(undefined);
    const error = await saveMarketingOptIn(value);
    if (error) {
      setOptIn(!value);
      setOptInNotice({ tone: "error", text: error });
    } else {
      setOptInNotice({
        tone: "success",
        text: value ? t.communications.subscribed : t.communications.unsubscribed,
      });
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
      <Title>{t.title}</Title>
      <Card>
        {name ? <Text style={styles.name}>{name}</Text> : <Body muted>{t.signedInAs}</Body>}
        <Text style={styles.email}>{account?.email || session?.user.email}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{roleLabel}</Text>
        </View>
      </Card>

      <Card>
        <Text style={styles.heading}>{t.settings}</Text>
        <View style={styles.rows}>
          <SettingsRow
            label={t.profile.title}
            detail={name || undefined}
            href="/compte-informations"
          />
          <SettingsRow
            label={t.email.title}
            detail={account?.pendingEmail ? t.email.pending(account.pendingEmail) : account?.email}
            href="/compte-email"
          />
          <SettingsRow label={t.password.title} href="/compte-mot-de-passe" />
        </View>
      </Card>

      <Card>
        <Text style={styles.heading}>{t.communications.title}</Text>
        {optInNotice ? <Notice tone={optInNotice.tone}>{optInNotice.text}</Notice> : null}
        <Checkbox
          label={t.communications.marketing}
          checked={marketing}
          onChange={toggleMarketing}
        />
        <Body muted>{t.communications.marketingHint}</Body>
        <LinkText
          label={t.communications.notifications}
          onPress={() => router.push("/notifications")}
        />
      </Card>

      <Card>
        <Text style={styles.heading}>{t.data.title}</Text>
        <Body muted>{t.data.intro}</Body>
        {exportFailed ? <Notice tone="error">{t.data.error}</Notice> : null}
        <Button
          label={t.data.download}
          variant="secondary"
          loading={exporting}
          onPress={exportData}
        />
      </Card>

      {(role === "artisan" || role === "artisan_en_attente") && (
        <Card>
          <Text style={styles.heading}>{t.subscription}</Text>
          {/* CLAUDE.md règle 10 : aucun bouton ni lien d'achat de l'abonnement artisan. */}
          <Notice tone="info">{t.subscriptionText}</Notice>
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
        <Text style={styles.heading}>{t.legal}</Text>
        <LinkText label={t.terms} onPress={() => WebBrowser.openBrowserAsync(siteLinks.terms)} />
        <LinkText
          label={t.privacy}
          onPress={() => WebBrowser.openBrowserAsync(siteLinks.privacy)}
        />
      </Card>

      <Card>
        <Text style={styles.heading}>{t.deletion.title}</Text>
        {account?.deletionRequestedAt ? (
          <Notice tone="info">{t.deletion.pending(formatDay(account.deletionRequestedAt))}</Notice>
        ) : (
          <>
            <Body muted>{t.deletion.intro}</Body>
            <LinkText label={t.deletion.open} onPress={() => router.push("/suppression-compte")} />
          </>
        )}
      </Card>

      <Card>
        <Text style={styles.heading}>{t.security.title}</Text>
        <Body muted>{t.security.signOutAllHint}</Body>
        <Button
          label={t.security.signOutAll}
          variant="secondary"
          loading={leaving === "everywhere"}
          disabled={leaving !== null}
          onPress={() => leave("everywhere")}
        />
      </Card>
      <Button
        label={t.signOut}
        variant="secondary"
        loading={leaving === "here"}
        disabled={leaving !== null}
        onPress={() => leave("here")}
      />
      <Body muted>{t.version(Constants.expoConfig?.version ?? "")}</Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { fontFamily: font.medium, fontSize: 18, color: colors.foreground },
  email: { fontFamily: font.medium, fontSize: 16, color: colors.foreground },
  heading: { fontFamily: font.medium, fontSize: 16, color: colors.foreground },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors["primary-soft"],
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: { fontFamily: font.medium, fontSize: 13, color: colors["primary-strong"] },
  rows: { marginHorizontal: -spacing(1) },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    minHeight: theme.touchTarget,
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(2.5),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pressed: { opacity: 0.7 },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  rowDetail: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
});
