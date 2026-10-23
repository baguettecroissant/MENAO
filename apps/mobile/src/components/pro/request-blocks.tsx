import type { RequestDetail } from "@menao/validation";
import * as WebBrowser from "expo-web-browser";
import { Calendar, MapPin, MessageSquare, Sparkles, User, Wrench } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { PhotoViewer } from "@/components/photo-viewer";
import { fr } from "@/i18n/fr";
import { formatLongDate } from "@/lib/dates";
import { Button, Card } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proRequests;
const { colors, font, radius, spacing } = theme;

export function DetailBlock({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <View style={styles.block}>
        <View style={styles.blockTitle}>
          {icon}
          <Text role="heading" style={styles.blockTitleText}>
            {title}
          </Text>
        </View>
        {children}
      </View>
    </Card>
  );
}

/** Photos du projet : vignettes ouvertes en grand d'un appui. */
function RequestPhotos({ urls }: { urls: string[] }) {
  const [viewing, setViewing] = useState<number | null>(null);
  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.photos}>
          {urls.map((url, i) => (
            <Pressable
              key={url}
              role="button"
              aria-label={t.photo(i + 1)}
              onPress={() => setViewing(i)}
            >
              <Image source={{ uri: url }} style={styles.photo} alt="" />
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <PhotoViewer photos={urls} index={viewing} onClose={() => setViewing(null)} />
    </>
  );
}

/**
 * Blocs communs à l'opportunité (F-17) et au rendez-vous (F-18), comme sur le site : client,
 * adresse, description (photos, critères), date souhaitée, message. Coordonnées et adresse exacte
 * seulement une fois le rendez-vous fixé (décision C, ADR 0014).
 * `onMessage` : « Écrire au client », dans la carte du client (maquette « Vue d'un rendez-vous »).
 */
export function RequestBlocks({
  detail: r,
  photoUrls,
  variant,
  onMessage,
}: {
  detail: RequestDetail;
  photoUrls: string[];
  variant: "opportunite" | "rendez-vous";
  onMessage?: () => void;
}) {
  const accepted = r.status === "acceptee";
  const clientName = [r.client.first_name, r.client.last_name].filter(Boolean).join(" ");
  const phone = accepted ? r.client.phone : null;
  const tags = [
    ...(r.lieu_type ? [fr.lieux[r.lieu_type]] : []),
    ...r.work_types,
    ...r.rooms,
    ...(r.surface ? [fr.surfaces[r.surface]] : []),
    ...(r.budget ? [t.budget(fr.budgets[r.budget])] : []),
  ];
  const wished =
    r.date_mode === "date" && r.date_souhaitee
      ? formatLongDate(r.date_souhaitee)
      : r.date_mode === "des_que_possible"
        ? t.dateAsap
        : t.dateUnknown;
  const icon = (Icon: typeof User) => <Icon size={18} color={colors.primary} />;

  return (
    <>
      <DetailBlock icon={icon(User)} title={t.client}>
        <Text style={styles.strong}>{clientName || "—"}</Text>
        {accepted && r.client.email ? <Text style={styles.meta}>{r.client.email}</Text> : null}
        {onMessage ? (
          <Button label={fr.proAppointment.writeClient} variant="secondary" onPress={onMessage} />
        ) : null}
        {phone ? (
          <Button
            label={t.call(r.client.first_name)}
            variant="secondary"
            onPress={() => Linking.openURL(`tel:${phone}`)}
          />
        ) : null}
        {!accepted ? <Text style={styles.meta}>{t.contactAfter}</Text> : null}
        {variant === "opportunite" ? (
          <Text style={styles.callback}>
            {r.callback_mode === "plage" && r.callback_from && r.callback_to
              ? t.callbackRange(
                  r.callback_from.slice(0, 5).replace(":", "h"),
                  r.callback_to.slice(0, 5).replace(":", "h"),
                )
              : t.callbackAsap}
          </Text>
        ) : null}
      </DetailBlock>

      <DetailBlock
        icon={icon(MapPin)}
        title={variant === "rendez-vous" ? fr.proAppointment.place : t.address}
      >
        <Text style={styles.text}>
          {accepted && r.adresse
            ? r.adresse
            : [r.code_postal, r.ville_nom].filter(Boolean).join(" ")}
        </Text>
        {r.hors_zone ? <Text style={styles.outside}>{t.outsideZone}</Text> : null}
        {accepted && r.lat !== null && r.lon !== null ? (
          <Pressable
            role="link"
            onPress={() =>
              WebBrowser.openBrowserAsync(
                `https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lon}#map=17/${r.lat}/${r.lon}`,
              )
            }
          >
            <Text style={styles.link}>{t.openMap}</Text>
          </Pressable>
        ) : null}
      </DetailBlock>

      {r.artisan_brief ? (
        <DetailBlock icon={icon(Sparkles)} title={t.brief}>
          <Text style={styles.text}>{r.artisan_brief}</Text>
          <Text style={styles.note}>{t.briefNote}</Text>
        </DetailBlock>
      ) : null}

      {r.autres_metiers.length > 0 ? (
        <Text style={styles.otherTrades}>{t.otherTrades(r.autres_metiers.join(", "))}</Text>
      ) : null}

      <DetailBlock
        icon={icon(Wrench)}
        title={variant === "rendez-vous" ? fr.proAppointment.reminder : t.description}
      >
        {r.summary ? <Text style={styles.strong}>{r.summary}</Text> : null}
        <Text style={styles.text}>{r.description}</Text>
        {photoUrls.length > 0 ? <RequestPhotos urls={photoUrls} /> : null}
        {tags.length > 0 ? (
          <View style={styles.tags}>
            {tags.map((tag) => (
              <Text key={tag} style={styles.tag}>
                {tag}
              </Text>
            ))}
          </View>
        ) : null}
      </DetailBlock>

      <DetailBlock icon={icon(Calendar)} title={t.date}>
        <Text style={styles.text}>{wished}</Text>
      </DetailBlock>

      {r.message ? (
        <DetailBlock icon={icon(MessageSquare)} title={t.message}>
          <Text style={styles.text}>{r.message}</Text>
        </DetailBlock>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing(2.5) },
  blockTitle: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  blockTitleText: { fontFamily: font.medium, fontSize: 16, color: colors.foreground },
  text: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.foreground },
  strong: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  meta: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  callback: {
    overflow: "hidden",
    borderRadius: radius.pill,
    backgroundColor: colors["primary-softer"],
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
    textAlign: "center",
    fontFamily: font.regular,
    fontSize: 12,
    color: colors["primary-strong"],
  },
  link: { fontFamily: font.medium, fontSize: 14, color: colors["primary-strong"] },
  photos: { flexDirection: "row", gap: spacing(2) },
  photo: { width: 96, height: 96, borderRadius: radius.input },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  otherTrades: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["primary-strong"],
    backgroundColor: colors["primary-softer"],
    borderRadius: radius.card,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
    overflow: "hidden",
  },
  outside: {
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.warning,
    backgroundColor: colors["warning-soft"],
    borderRadius: radius.input,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    overflow: "hidden",
  },
  note: {
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors["muted-foreground"],
  },
  // Puces bleu clair des maquettes (« En appartement », « Installation de prises »).
  tag: {
    overflow: "hidden",
    borderRadius: radius.pill,
    backgroundColor: colors["primary-softer"],
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1),
    fontFamily: font.medium,
    fontSize: 12,
    color: colors["primary-strong"],
  },
});
