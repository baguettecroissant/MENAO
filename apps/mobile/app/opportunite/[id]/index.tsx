import { timeLeft } from "@menao/core";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Calendar, Clock, MapPin, MessageSquare, User, Wrench } from "lucide-react-native";
import { useCallback, type ReactNode } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusPill } from "@/components/chantier/parts";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { formatLongDate } from "@/lib/dates";
import { loadOpportunity } from "@/lib/pro-requests";
import { useFocusData } from "@/lib/use-focus-data";
import { Button, Card, Notice, Screen, Title } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proRequests;
const { colors, font, radius, spacing } = theme;

function Block({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
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

/**
 * Opportunité (F-17), comme sur le site (maquette « Vue d'une opportunité ») : client, adresse,
 * description, date souhaitée, message ; puis « Fixer un rendez-vous » ou « Refuser le chantier ».
 * Coordonnées et adresse exacte seulement une fois le rendez-vous fixé (ADR 0014).
 */
export default function OpportunityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const load = useCallback(() => loadOpportunity(id), [id]);
  const [opportunity] = useFocusData(load);

  if (opportunity === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (opportunity === null) {
    return (
      <Screen header={<TopBar />}>
        <Notice tone="error">{t.notFound}</Notice>
      </Screen>
    );
  }

  const { detail: r, photoUrls } = opportunity;
  const left = r.status === "envoyee" ? timeLeft(new Date(r.expires_at), new Date()) : null;
  // En attente de réponse, ou acceptée sans rendez-vous (ADR 0016) : on peut encore agir.
  const open =
    !r.chantier_id && ((r.status === "envoyee" && left !== null) || r.status === "acceptee");
  const accepted = r.status === "acceptee";
  const clientName = [r.client.first_name, r.client.last_name].filter(Boolean).join(" ");
  const tags = [
    ...(r.lieu_type ? [fr.lieux[r.lieu_type]] : []),
    ...r.work_types,
    ...r.rooms,
    ...(r.surface ? [fr.surfaces[r.surface]] : []),
  ];
  const wished =
    r.date_mode === "date" && r.date_souhaitee
      ? formatLongDate(r.date_souhaitee)
      : r.date_mode === "des_que_possible"
        ? t.dateAsap
        : t.dateUnknown;
  const phone = accepted ? r.client.phone : null;

  return (
    <Screen
      header={<TopBar />}
      footer={
        open ? (
          <View style={styles.actions}>
            <Button
              label={t.fixAppointment}
              onPress={() =>
                router.push({
                  pathname: "/opportunite/[id]/rendez-vous",
                  params: { id, client: r.client.first_name ?? "" },
                })
              }
            />
            {r.status === "envoyee" ? (
              <Button
                label={t.refuse}
                variant="ghost"
                onPress={() => router.push(`/opportunite/${id}/refuser`)}
              />
            ) : null}
          </View>
        ) : undefined
      }
    >
      <View style={styles.head}>
        <Title>{r.summary || r.trade || t.title}</Title>
        <View style={styles.tags}>
          <StatusPill
            text={t.status[r.status]}
            tone={r.status === "envoyee" ? "primary" : "neutral"}
          />
          {r.urgence ? <StatusPill text={t.urgent} tone="danger" /> : null}
        </View>
        {left ? (
          <View style={styles.row}>
            <Clock size={14} color={colors["muted-foreground"]} />
            <Text style={styles.meta}>{t.timeLeft(left.hours, left.minutes)}</Text>
          </View>
        ) : null}
      </View>
      {r.chantier_id ? <Notice tone="success">{t.appointmentFixed}</Notice> : null}

      <Block icon={<User size={18} color={colors.primary} />} title={t.client}>
        <Text style={styles.strong}>{clientName || "—"}</Text>
        {accepted && r.client.email ? <Text style={styles.meta}>{r.client.email}</Text> : null}
        {phone ? (
          <Button
            label={t.call(r.client.first_name)}
            variant="secondary"
            onPress={() => Linking.openURL(`tel:${phone}`)}
          />
        ) : null}
        {!accepted ? <Text style={styles.meta}>{t.contactAfter}</Text> : null}
        {open ? (
          <Text style={styles.callback}>
            {r.callback_mode === "plage" && r.callback_from && r.callback_to
              ? t.callbackRange(
                  r.callback_from.slice(0, 5).replace(":", "h"),
                  r.callback_to.slice(0, 5).replace(":", "h"),
                )
              : t.callbackAsap}
          </Text>
        ) : null}
      </Block>

      <Block icon={<MapPin size={18} color={colors.primary} />} title={t.address}>
        <Text style={styles.text}>
          {accepted && r.adresse
            ? r.adresse
            : [r.code_postal, r.ville_nom].filter(Boolean).join(" ")}
        </Text>
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
      </Block>

      <Block icon={<Wrench size={18} color={colors.primary} />} title={t.description}>
        {r.summary ? <Text style={styles.strong}>{r.summary}</Text> : null}
        <Text style={styles.text}>{r.description}</Text>
        {photoUrls.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.photos}>
              {photoUrls.map((url, i) => (
                <Pressable
                  key={url}
                  role="link"
                  aria-label={t.photo(i + 1)}
                  onPress={() => WebBrowser.openBrowserAsync(url)}
                >
                  <Image source={{ uri: url }} style={styles.photo} alt="" />
                </Pressable>
              ))}
            </View>
          </ScrollView>
        ) : null}
        {tags.length > 0 ? (
          <View style={styles.tags}>
            {tags.map((tag) => (
              <Text key={tag} style={styles.tag}>
                {tag}
              </Text>
            ))}
          </View>
        ) : null}
      </Block>

      <Block icon={<Calendar size={18} color={colors.primary} />} title={t.date}>
        <Text style={styles.text}>{wished}</Text>
      </Block>

      {r.message ? (
        <Block icon={<MessageSquare size={18} color={colors.primary} />} title={t.message}>
          <Text style={styles.text}>{r.message}</Text>
        </Block>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  head: { gap: spacing(2) },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  row: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  actions: { gap: spacing(1) },
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
  tag: {
    overflow: "hidden",
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1),
    fontFamily: font.regular,
    fontSize: 12,
    color: colors["muted-foreground"],
  },
});
