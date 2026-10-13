import { TICKET_MESSAGE_MAX_LENGTH } from "@menao/core";
import { ticketMessageSchema } from "@menao/validation";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { StatusPill } from "@/components/chantier/parts";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { addTicketMessage, loadTicket } from "@/lib/disputes";
import { formatDateNumeric, formatDayAndTime } from "@/lib/format";
import { choosePhotoSource, pickPhotos, uploadPhoto } from "@/lib/photos";
import { useSession } from "@/lib/session";
import { useFocusData } from "@/lib/use-focus-data";
import { Button, Card, LinkText, Notice, Screen, TextField, Title } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.dispute;
const { colors, font, radius, spacing } = theme;
const TONE = { ouvert: "primary", en_cours: "warning", resolu: "neutral" } as const;

/**
 * Suivi d'un signalement par son déclarant (F-42), comme sur le site : description, échanges avec
 * l'équipe MENAO (photos comprises), réponse et photos tant que le signalement n'est pas clos.
 */
export default function TicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const artisan = useSession().space === "artisan";
  const load = useCallback(() => loadTicket(id), [id]);
  const [ticket, reload] = useFocusData(load);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, setPending] = useState(false);

  if (ticket === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (ticket === null) {
    return (
      <Screen header={<TopBar />}>
        <Notice tone="error">{t.notFound}</Notice>
      </Screen>
    );
  }

  async function send() {
    const parsed = ticketMessageSchema.safeParse({ body });
    if (!parsed.success) {
      setError(z.flattenError(parsed.error).fieldErrors.body?.[0]);
      return;
    }
    setError(undefined);
    setPending(true);
    const failed = await addTicketMessage(id, parsed.data.body);
    setPending(false);
    if (failed) return setError(failed);
    setBody("");
    await reload();
  }

  const closed = ticket.status === "resolu";
  return (
    <Screen header={<TopBar />}>
      <View style={styles.head}>
        <Title>{t.ticketTitle}</Title>
        <StatusPill text={t.statuses[ticket.status]} tone={TONE[ticket.status]} />
        <LinkText
          label={t.chantierLink(ticket.chantier.title)}
          onPress={() =>
            router.push(
              artisan ? `/pro-chantier/${ticket.chantier.id}` : `/chantier/${ticket.chantier.id}`,
            )
          }
        />
        {ticket.category ? (
          <Text style={styles.meta}>
            {t.ticketMeta(t.categories[ticket.category], formatDateNumeric(ticket.createdAt))}
          </Text>
        ) : null}
      </View>
      <Card>
        <View style={styles.section}>
          <Text role="heading" style={styles.heading}>
            {t.description}
          </Text>
          <Text style={styles.text}>{ticket.message}</Text>
        </View>
      </Card>
      <Card>
        <View style={styles.section}>
          <Text role="heading" style={styles.heading}>
            {t.thread}
          </Text>
          {ticket.entries.length === 0 ? (
            <Text style={styles.meta}>{t.noMessages}</Text>
          ) : (
            ticket.entries.map((entry) => {
              const { day, time } = formatDayAndTime(entry.createdAt);
              return (
                <View key={entry.id} style={[styles.entry, entry.fromStaff && styles.entryStaff]}>
                  <Text style={styles.meta}>
                    <Text style={styles.author}>{entry.fromStaff ? t.support : t.you}</Text>
                    {` · ${day} à ${time}`}
                  </Text>
                  {entry.photoUrl ? (
                    <Pressable
                      role="link"
                      aria-label={t.photo}
                      onPress={() => entry.photoUrl && WebBrowser.openBrowserAsync(entry.photoUrl)}
                    >
                      <Image source={{ uri: entry.photoUrl }} style={styles.photo} alt="" />
                    </Pressable>
                  ) : (
                    <Text style={styles.text}>{entry.body}</Text>
                  )}
                </View>
              );
            })
          )}
          {closed ? (
            <Notice tone="info">{t.closed}</Notice>
          ) : (
            <View style={styles.reply}>
              <TextField
                label={t.messageLabel}
                value={body}
                onChangeText={(value) => {
                  setBody(value);
                  setError(undefined);
                }}
                maxLength={TICKET_MESSAGE_MAX_LENGTH}
                multiline
                error={error}
              />
              <Button label={t.messageSubmit} onPress={send} loading={pending} />
              <TicketPhotoUpload ticketId={id} onAdded={reload} />
            </View>
          )}
        </View>
      </Card>
    </Screen>
  );
}

/** « Ajouter une photo » au signalement (F-42) : vérifiée et rangée par process-upload. */
function TicketPhotoUpload({ ticketId, onAdded }: { ticketId: string; onAdded: () => void }) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function add() {
    const source = await choosePhotoSource(t.addPhoto);
    if (!source) return;
    const picked = await pickPhotos(source);
    if ("error" in picked) return setNotice({ tone: "error", text: picked.error });
    const photo = picked.photos[0];
    if (!photo) return;
    setBusy(true);
    setNotice(null);
    const status = await uploadPhoto({ purpose: "ticket_photo", ticketId }, photo);
    setBusy(false);
    if (status === "ok") {
      setNotice({ tone: "success", text: t.photoAdded });
      onAdded();
    } else {
      setNotice({
        tone: "error",
        text: t.photoErrors[status as keyof typeof t.photoErrors] ?? t.photoErrors.failed,
      });
    }
  }

  return (
    <View style={styles.reply}>
      <Button label={t.addPhoto} variant="secondary" onPress={add} loading={busy} />
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
    </View>
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
  section: { gap: spacing(3) },
  heading: { fontFamily: font.medium, fontSize: 16, color: colors.foreground },
  text: { fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: colors.foreground },
  meta: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
  author: { fontFamily: font.medium, color: colors.foreground },
  entry: {
    gap: spacing(1),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(3),
  },
  entryStaff: { borderWidth: 0, backgroundColor: colors["primary-softer"] },
  photo: { width: 200, height: 150, borderRadius: radius.input },
  reply: { gap: spacing(2) },
});
