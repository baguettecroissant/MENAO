import { partnerLinks } from "@menao/core";
import type { ReferralRow } from "@menao/validation";
import { Maximize2, Share2, ShieldCheck, Star, X } from "lucide-react-native";
import { useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { QrCode } from "@/components/qr-code";
import { Segmented } from "@/components/segmented";
import { fr } from "@/i18n/fr";
import { env } from "@/lib/env";
import type { ProfileHub } from "@/lib/profile-hub";
import { Button } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proHub;
const s = t.share;
const r = t.referral;
const { colors, font, radius, spacing } = theme;

type Tab = "card" | "referral";

/**
 * Carte de visite et parrainage (ADR 0191), à montrer sur un chantier : deux onglets.
 * - « Ma carte de visite » : QR code de la fiche publique, que le client scanne avec l'appareil
 *   photo de son téléphone, et « Partager ma fiche ».
 * - « Parrainer un confrère » : QR code de l'inscription artisan avec le code déjà rempli, et le
 *   code à saisir, au choix du confrère ; « Partager mon code » reste du texte seul (ADR 0137).
 * Un toucher sur le QR code (ou « Agrandir ») l'affiche en plein écran. Aucune mention de
 * l'abonnement (CLAUDE.md règle 10).
 */
export function ShareCard({ hub }: { hub: ProfileHub }) {
  const { pageUrl, referral } = hub;
  const [tab, setTab] = useState<Tab>(pageUrl ? "card" : "referral");
  const [full, setFull] = useState<Tab | null>(null);
  if (!pageUrl && !referral) return null;
  const current: Tab = tab === "card" && pageUrl ? "card" : "referral";
  const code = referral?.code ?? "";
  // Lien court du site (ADR 0137) : il ouvre l'inscription artisan avec le code rempli.
  const referralUrl = referral ? partnerLinks(env.siteUrl, code.toLowerCase()).pros : "";

  return (
    <View style={styles.card}>
      {pageUrl && referral ? (
        <Segmented
          label={s.label}
          options={[
            { value: "card", label: s.tabs.card },
            { value: "referral", label: s.tabs.referral },
          ]}
          value={current}
          onChange={setTab}
        />
      ) : null}

      {current === "card" && pageUrl ? (
        <>
          <View style={styles.ticket}>
            <View style={styles.person}>
              <View style={styles.avatar}>
                {hub.avatarUrl ? (
                  <Image source={{ uri: hub.avatarUrl }} style={styles.avatarImage} alt="" />
                ) : (
                  <Text style={styles.initials}>{hub.initials}</Text>
                )}
              </View>
              <View style={styles.personText}>
                <Text style={styles.name} numberOfLines={1}>
                  {hub.name}
                </Text>
                {hub.company || hub.city ? (
                  <Text style={styles.company} numberOfLines={1}>
                    {[hub.company, hub.city].filter(Boolean).join(" · ")}
                  </Text>
                ) : null}
              </View>
            </View>
            {hub.verified || hub.score ? (
              <View style={styles.badges}>
                {hub.verified ? (
                  <View style={[styles.badge, styles.badgeSuccess]}>
                    <ShieldCheck size={13} color={colors.success} />
                    <Text style={[styles.badgeText, { color: colors.success }]}>{t.verified}</Text>
                  </View>
                ) : null}
                {hub.score ? (
                  <View style={[styles.badge, styles.badgePrimary]}>
                    <Star size={13} color={colors["primary-strong"]} />
                    <Text style={[styles.badgeText, { color: colors["primary-strong"] }]}>
                      {t.score(hub.score.percent, hub.score.count)}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
            <QrTile value={pageUrl} label={s.card.qrLabel} onPress={() => setFull("card")} />
            <Text style={styles.url} numberOfLines={1}>
              {pageUrl.replace(/^https?:\/\//, "")}
            </Text>
          </View>
          <Text style={styles.hint}>{s.card.hint}</Text>
          <View style={styles.actions}>
            <View style={styles.action}>
              <Button
                label={s.expand}
                icon={Maximize2}
                variant="secondary"
                onPress={() => setFull("card")}
              />
            </View>
            <View style={styles.action}>
              <Button
                label={s.share}
                icon={Share2}
                variant="secondary"
                onPress={() => Share.share({ message: s.card.shareMessage(hub.name, pageUrl) })}
              />
            </View>
          </View>
        </>
      ) : referral ? (
        <>
          <View style={styles.ticket}>
            <Text style={styles.ticketTitle}>{r.title}</Text>
            <QrTile
              value={referralUrl}
              label={s.referral.qrLabel}
              onPress={() => setFull("referral")}
            />
            <View
              style={styles.codeBox}
              accessible
              accessibilityLabel={`${r.codeLabel} : ${code.toUpperCase()}`}
            >
              <Text style={styles.codeLabel}>{s.referral.orCode}</Text>
              <Text style={styles.code} selectable>
                {code.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.hint}>{s.referral.hint}</Text>
          <View style={styles.actions}>
            <View style={styles.action}>
              <Button
                label={s.expand}
                icon={Maximize2}
                variant="secondary"
                onPress={() => setFull("referral")}
              />
            </View>
            <View style={styles.action}>
              <Button
                label={s.share}
                icon={Share2}
                variant="secondary"
                onPress={() => Share.share({ message: r.shareMessage(code.toUpperCase()) })}
              />
            </View>
          </View>
          <ReferralProgress
            joined={referral.joined}
            rewarded={referral.rewarded}
            referrals={hub.referrals}
          />
        </>
      ) : null}

      <FullScreenQr
        visible={full !== null}
        onClose={() => setFull(null)}
        title={full === "card" ? hub.name : s.fullscreen.referral}
        hint={full === "card" ? s.fullscreen.cardHint : s.fullscreen.referralHint}
        value={full === "card" ? (pageUrl ?? "") : referralUrl}
        label={full === "card" ? s.card.qrLabel : s.referral.qrLabel}
        code={full === "referral" ? code.toUpperCase() : null}
      />
    </View>
  );
}

/** QR code sur sa tuile blanche ; un toucher l'agrandit. */
function QrTile({ value, label, onPress }: { value: string; label: string; onPress: () => void }) {
  return (
    <Pressable
      role="button"
      aria-label={`${label}, ${s.expand}`}
      onPress={onPress}
      style={({ pressed }) => [styles.qrTile, pressed && styles.pressed]}
    >
      <QrCode value={value} size={172} label={label} />
    </Pressable>
  );
}

/** Confrères inscrits, score de fidélité et suivi de chaque filleul (ADR 0161). */
function ReferralProgress({
  joined,
  rewarded,
  referrals,
}: {
  joined: number;
  rewarded: number;
  referrals: ReferralRow[];
}) {
  return (
    <View style={styles.progress}>
      <Text style={styles.progressText}>{r.joined(joined)}</Text>
      <Text style={styles.progressText}>
        {r.loyalty(rewarded)} · {r.loyaltyHint}
      </Text>
      {referrals.length ? (
        <View style={styles.list}>
          <Text style={styles.codeLabel}>{r.listTitle}</Text>
          {referrals.map((row) => (
            <View key={row.id} style={styles.listRow}>
              <Text style={styles.listName} numberOfLines={1}>
                {row.nom}
              </Text>
              <Text style={[styles.listStep, row.etape === "abonne" && styles.listStepDone]}>
                {r.steps[row.etape]}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** QR code en plein écran, sur fond blanc, pour le montrer de près sur un chantier. */
function FullScreenQr({
  visible,
  onClose,
  title,
  hint,
  value,
  label,
  code,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  hint: string;
  value: string;
  label: string;
  code: string | null;
}) {
  const { width } = useWindowDimensions();
  const size = Math.min(width - spacing(16), 340);
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={styles.full}>
        <Pressable
          role="button"
          aria-label={s.fullscreen.close}
          onPress={onClose}
          hitSlop={8}
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}
        >
          <X size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.fullBody}>
          <Text role="heading" style={styles.fullTitle} numberOfLines={2}>
            {title}
          </Text>
          {value ? <QrCode value={value} size={size} label={label} /> : null}
          {code ? (
            <View style={styles.fullCode}>
              <Text style={styles.codeLabel}>{s.referral.orCode}</Text>
              <Text style={[styles.code, styles.codeLarge]}>{code}</Text>
            </View>
          ) : null}
          <Text style={styles.fullHint}>{hint}</Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing(3.5),
    padding: spacing(4),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  ticket: {
    alignItems: "center",
    gap: spacing(3),
    padding: spacing(4),
    borderRadius: radius.hero,
    backgroundColor: colors["primary-softer"],
  },
  person: { flexDirection: "row", alignItems: "center", gap: spacing(3), alignSelf: "stretch" },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: { width: 48, height: 48 },
  initials: { fontFamily: font.bold, fontSize: 17, color: colors["primary-foreground"] },
  personText: { flex: 1, gap: 2 },
  name: { fontFamily: font.bold, fontSize: 17, color: colors.foreground },
  company: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing(1.5), alignSelf: "stretch" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1),
    borderRadius: radius.pill,
  },
  badgeSuccess: { backgroundColor: colors["success-soft"] },
  badgePrimary: { backgroundColor: colors["primary-soft"] },
  badgeText: { fontFamily: font.medium, fontSize: 12 },
  ticketTitle: { fontFamily: font.bold, fontSize: 16, color: colors.foreground },
  qrTile: {
    padding: spacing(2),
    borderRadius: radius.card,
    backgroundColor: "#ffffff",
  },
  pressed: { opacity: 0.85 },
  url: { fontFamily: font.medium, fontSize: 13, color: colors["primary-strong"] },
  codeBox: { alignItems: "center", gap: 2 },
  codeLabel: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
  code: {
    fontFamily: font.bold,
    fontSize: 24,
    letterSpacing: 3,
    color: colors["primary-strong"],
  },
  codeLarge: { fontSize: 32, letterSpacing: 5 },
  hint: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  actions: { flexDirection: "row", gap: spacing(2) },
  action: { flex: 1 },
  progress: { gap: spacing(1.5) },
  progressText: { fontFamily: font.medium, fontSize: 13, color: colors["muted-foreground"] },
  list: { gap: spacing(1.5) },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing(3),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing(1.5),
  },
  listName: { flex: 1, fontFamily: font.medium, fontSize: 14, color: colors.foreground },
  listStep: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  listStepDone: { color: colors.success },
  full: { flex: 1, backgroundColor: "#ffffff" },
  close: {
    alignSelf: "flex-end",
    width: theme.touchTarget,
    height: theme.touchTarget,
    margin: spacing(3),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: colors.background,
  },
  fullBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing(5),
    paddingHorizontal: spacing(8),
    paddingBottom: spacing(16),
  },
  fullTitle: {
    fontFamily: font.bold,
    fontSize: 24,
    textAlign: "center",
    color: colors.foreground,
  },
  fullCode: { alignItems: "center", gap: 2 },
  fullHint: {
    fontFamily: font.regular,
    fontSize: 15,
    textAlign: "center",
    color: colors["muted-foreground"],
  },
});
