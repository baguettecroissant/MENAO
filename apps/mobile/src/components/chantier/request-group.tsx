import { timeLeft } from "@menao/core";
import { router } from "expo-router";
import { Mail, MapPin, Phone } from "lucide-react-native";
import { Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { artisanAvatar, type RequestRow } from "@/lib/chantiers";
import { LinkText } from "@/ui";
import { theme } from "@/ui/theme";
import { ChantierCover, StatusPill, type Tone } from "./parts";

const t = fr.myRequests;
const { colors, font, radius, spacing } = theme;
const TONE: Record<RequestRow["status"], Tone> = {
  envoyee: "primary",
  acceptee: "success",
  refusee: "danger",
  expiree: "neutral",
  annulee: "neutral",
  a_verifier: "warning",
};

/**
 * Demande en attente (F-11), par projet : les artisans sollicités, leur réponse, le délai restant
 * et l'annulation ; une demande acceptée mène au chantier, avec les coordonnées de l'artisan.
 */
export function RequestGroup({
  items,
  photoUrl,
  now,
  cancelledByClient,
  chantier = null,
}: {
  items: RequestRow[];
  photoUrl: string | null;
  now: Date;
  cancelledByClient: ReadonlySet<string>;
  /** Lot d'un chantier à plusieurs métiers (ADR 0168) : nom du chantier. */
  chantier?: string | null;
}) {
  const head = items[0];
  if (!head) return null;
  const lead = items.find((r) => r.status === "acceptee") ?? head;
  const canChoose = items.some(
    (r) => r.status === "refusee" || r.status === "expiree" || r.status === "annulee",
  );
  return (
    <View style={styles.card}>
      <ChantierCover url={photoUrl} trade={head.trade_label} height={120} />
      <View style={styles.body}>
        <StatusPill text={t.status[lead.status]} tone={TONE[lead.status]} />
        <Text style={styles.title}>{head.trade_label}</Text>
        {chantier ? <Text style={styles.meta}>{fr.myChantiers.lotOf(chantier)}</Text> : null}
        {head.ville_nom ? (
          <View style={styles.row}>
            <MapPin size={14} color={colors["muted-foreground"]} />
            <Text style={styles.meta}>{head.ville_nom}</Text>
          </View>
        ) : null}
        {head.summary ? <Text style={styles.meta}>{head.summary}</Text> : null}
        {canChoose && (
          <LinkText
            label={t.chooseAnother}
            onPress={() =>
              router.push({ pathname: "/projet/[id]/artisans", params: { id: head.project_id } })
            }
          />
        )}
      </View>
      <View style={styles.side}>
        <Text style={styles.sideLabel}>{t.yourArtisans}</Text>
        {items.map((r) => {
          const left = r.status === "envoyee" ? timeLeft(new Date(r.expires_at), now) : null;
          const avatar = artisanAvatar(r.artisan_avatar_path);
          return (
            <View key={r.request_id} style={styles.artisan}>
              <View style={styles.row}>
                {avatar ? (
                  <Image source={{ uri: avatar }} style={styles.avatar} alt="" />
                ) : (
                  <View style={[styles.avatar, styles.avatarEmpty]}>
                    <Text style={styles.avatarText}>{r.artisan_name.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View style={styles.flex}>
                  <Text style={styles.name}>{r.artisan_name}</Text>
                  <Text
                    style={[
                      styles.meta,
                      r.status === "acceptee" && { color: colors.success },
                      r.status === "refusee" && { color: colors.danger },
                    ]}
                  >
                    {t.status[r.status]}
                  </Text>
                </View>
              </View>
              {left && <Text style={styles.meta}>{t.timeLeft(left.hours, left.minutes)}</Text>}
              {r.status === "a_verifier" && <Text style={styles.meta}>{t.verificationHint}</Text>}
              {(r.status === "envoyee" || r.status === "a_verifier") && (
                <LinkText
                  label={fr.clientCancel.open}
                  onPress={() =>
                    router.push({
                      pathname: "/demande/[id]/annuler",
                      params: { id: r.request_id, artisan: r.artisan_name },
                    })
                  }
                />
              )}
              {r.status === "annulee" && cancelledByClient.has(r.request_id) ? (
                <Text style={styles.meta}>{t.cancelledByYou}</Text>
              ) : r.status === "annulee" && r.chantier_status === "annule" ? (
                <Text style={styles.meta}>{t.cancelledByArtisan}</Text>
              ) : null}
              {r.status === "acceptee" && r.artisan_phone ? (
                <Pressable
                  role="link"
                  style={styles.row}
                  onPress={() => Linking.openURL(`tel:${r.artisan_phone}`)}
                >
                  <Phone size={14} color={colors["primary-strong"]} />
                  <Text style={styles.contact}>{r.artisan_phone}</Text>
                </Pressable>
              ) : null}
              {r.status === "acceptee" && r.artisan_email ? (
                <Pressable
                  role="link"
                  style={styles.row}
                  onPress={() => Linking.openURL(`mailto:${r.artisan_email}`)}
                >
                  <Mail size={14} color={colors["primary-strong"]} />
                  <Text style={styles.contact}>{r.artisan_email}</Text>
                </Pressable>
              ) : null}
              {r.chantier_id && r.chantier_status !== "annule" ? (
                <LinkText
                  label={t.seeChantier}
                  onPress={() =>
                    router.push({
                      pathname: "/chantier/[id]",
                      params: { id: r.chantier_id as string },
                    })
                  }
                />
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  body: { gap: spacing(2.5), padding: spacing(4) },
  title: { fontFamily: font.medium, fontSize: 18, color: colors.foreground },
  row: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  meta: {
    flexShrink: 1,
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors["muted-foreground"],
  },
  side: {
    gap: spacing(3),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    padding: spacing(4),
  },
  sideLabel: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
  artisan: {
    gap: spacing(2),
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing(3),
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarEmpty: {
    backgroundColor: colors["primary-soft"],
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: font.medium, fontSize: 15, color: colors["primary-strong"] },
  flex: { flex: 1 },
  name: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  contact: { fontFamily: font.medium, fontSize: 13, color: colors["primary-strong"] },
});
