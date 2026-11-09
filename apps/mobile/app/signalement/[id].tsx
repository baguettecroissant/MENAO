import { TICKET_MESSAGE_MAX_LENGTH } from "@menao/core";
import { ticketMessageSchema } from "@menao/validation";
import { router, useLocalSearchParams } from "expo-router";
import { Camera, Send } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { z } from "zod";
import { PhotoViewer } from "@/components/photo-viewer";
import {
  CardHeading,
  FicheCard,
  FicheHead,
  FicheScreen,
  FicheSkeleton,
  FicheTag,
} from "@/components/pro/fiche-kit";
import { fr } from "@/i18n/fr";
import { addTicketMessage, loadTicket, type TicketEntry } from "@/lib/disputes";
import { formatDateNumeric, formatDayAndTime } from "@/lib/format";
import { choosePhotoSource, pickPhotos, uploadPhoto } from "@/lib/photos";
import { useSession } from "@/lib/session";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice, toast } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.dispute;
const { colors, font, radius, spacing } = theme;
const TONE = { ouvert: "primary", en_cours: "warning", resolu: "neutral" } as const;

/**
 * Suivi d'un signalement par son déclarant (F-42), comme sur le site : description, échanges avec
 * l'équipe MENAO (photos comprises), réponse et photos tant que le signalement n'est pas clos.
 * Refonte « Nette » (lot 13, maquette « EchangeApp ») : pastilles nature et état, grand titre,
 * bulles (les siennes en bleu nuit à droite, l'équipe MENAO en blanc à gauche) avec « qui · quand »,
 * barre d'écriture collée en bas (rond photo, champ arrondi, rond d'envoi bleu).
 */
export default function TicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const artisan = useSession().space === "artisan";
  const load = useCallback(() => loadTicket(id), [id]);
  const [ticket, reload] = useFocusData(load);
  const [viewing, setViewing] = useState<number | null>(null);

  if (ticket === undefined) return <FicheSkeleton title={t.bar} />;
  if (ticket === null) {
    return (
      <FicheScreen title={t.bar} onRefresh={reload}>
        <Notice tone="error">{t.notFound}</Notice>
      </FicheScreen>
    );
  }

  const closed = ticket.status === "resolu";
  // Photos de l'échange, ouvertes en grand d'un appui (on passe de l'une à l'autre).
  const photos = ticket.entries.flatMap((entry) => (entry.photoUrl ? [entry.photoUrl] : []));
  return (
    <FicheScreen
      title={t.bar}
      keyboard
      footer={
        closed ? (
          <Notice tone="info">{t.closed}</Notice>
        ) : (
          <TicketComposer ticketId={id} onSent={reload} />
        )
      }
    >
      <FicheHead
        tags={
          <>
            {ticket.category ? (
              <FicheTag text={t.categories[ticket.category]} tone="neutral" />
            ) : null}
            <FicheTag text={t.statuses[ticket.status]} tone={TONE[ticket.status]} dot />
          </>
        }
        title={t.ticketTitle}
        meta={
          ticket.category
            ? t.ticketMeta(t.categories[ticket.category], formatDateNumeric(ticket.createdAt))
            : null
        }
      />
      <Pressable
        role="link"
        hitSlop={6}
        onPress={() =>
          router.push(
            artisan ? `/pro-chantier/${ticket.chantier.id}` : `/chantier/${ticket.chantier.id}`,
          )
        }
        style={({ pressed }) => [styles.chantier, pressed && styles.pressed]}
      >
        <Text style={styles.chantierText}>{t.chantierLink(ticket.chantier.title)}</Text>
      </Pressable>
      <FicheCard padding={4} gap={2}>
        <CardHeading title={t.description} size={17} />
        <Text style={styles.text}>{ticket.message}</Text>
      </FicheCard>
      <View style={styles.thread}>
        <CardHeading title={t.thread} size={17} />
        {ticket.entries.length === 0 ? (
          <Text style={styles.empty}>{t.noMessages}</Text>
        ) : (
          ticket.entries.map((entry) => (
            <Bubble
              key={entry.id}
              entry={entry}
              onOpenPhoto={() => setViewing(photos.indexOf(entry.photoUrl ?? ""))}
            />
          ))
        )}
      </View>
      <PhotoViewer photos={photos} index={viewing} onClose={() => setViewing(null)} />
    </FicheScreen>
  );
}

/** Une bulle de l'échange : « qui · quand » au-dessus, texte ou photo dedans. */
function Bubble({ entry, onOpenPhoto }: { entry: TicketEntry; onOpenPhoto: () => void }) {
  const mine = !entry.fromStaff;
  const { day, time } = formatDayAndTime(entry.createdAt);
  return (
    <View style={[styles.entry, mine ? styles.entryMine : styles.entryStaff]}>
      <Text style={[styles.who, mine && styles.whoMine]}>
        {`${entry.fromStaff ? t.support : t.you} · ${day} à ${time}`}
      </Text>
      {entry.photoUrl ? (
        <Pressable role="button" aria-label={t.photo} onPress={onOpenPhoto}>
          <Image source={{ uri: entry.photoUrl }} style={styles.photo} alt="" />
        </Pressable>
      ) : (
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleStaff]}>
          <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{entry.body}</Text>
        </View>
      )}
    </View>
  );
}

/**
 * Barre d'écriture collée en bas : « Ajouter une photo » (rond, vérifiée et rangée par
 * process-upload), message à l'équipe MENAO (champ arrondi), « Envoyer » (rond bleu).
 */
function TicketComposer({ ticketId, onSent }: { ticketId: string; onSent: () => Promise<void> }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  async function send() {
    const parsed = ticketMessageSchema.safeParse({ body });
    if (!parsed.success) {
      setError(z.flattenError(parsed.error).fieldErrors.body?.[0]);
      return;
    }
    setError(undefined);
    setPending(true);
    const failed = await addTicketMessage(ticketId, parsed.data.body);
    setPending(false);
    if (failed) return setError(failed);
    setBody("");
    await onSent();
  }

  async function addPhoto() {
    const source = await choosePhotoSource(t.addPhoto);
    if (!source) return;
    const picked = await pickPhotos(source);
    if ("error" in picked) return setPhotoError(picked.error);
    const photo = picked.photos[0];
    if (!photo) return;
    setBusy(true);
    setPhotoError(null);
    const status = await uploadPhoto({ purpose: "ticket_photo", ticketId }, photo);
    setBusy(false);
    if (status === "ok") {
      toast.success(t.photoAdded);
      void onSent();
    } else {
      setPhotoError(t.photoErrors[status as keyof typeof t.photoErrors] ?? t.photoErrors.failed);
    }
  }

  const message = error ?? photoError;
  return (
    <>
      {message ? (
        <Text role="alert" style={styles.error}>
          {message}
        </Text>
      ) : null}
      <View style={styles.composer}>
        <Pressable
          role="button"
          aria-label={t.addPhoto}
          aria-busy={busy}
          aria-disabled={busy}
          disabled={busy}
          onPress={addPhoto}
          style={({ pressed }) => [
            styles.round,
            busy && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          {busy ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Camera size={20} color={colors.foreground} />
          )}
        </Pressable>
        <TextInput
          aria-label={t.messageLabel}
          accessibilityHint={error}
          value={body}
          onChangeText={(value) => {
            setBody(value);
            setError(undefined);
          }}
          placeholder={t.messageLabel}
          placeholderTextColor={colors["subtle-foreground"]}
          maxLength={TICKET_MESSAGE_MAX_LENGTH}
          multiline
          style={[styles.input, error ? styles.inputInvalid : null]}
        />
        <Pressable
          role="button"
          aria-label={t.messageSubmit}
          aria-busy={pending}
          aria-disabled={pending}
          disabled={pending}
          onPress={send}
          style={({ pressed }) => [
            styles.send,
            pending && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          {pending ? (
            <ActivityIndicator color={colors["primary-foreground"]} />
          ) : (
            <Send size={18} strokeWidth={2.2} color={colors["primary-foreground"]} />
          )}
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  chantier: { alignSelf: "flex-start", marginTop: -spacing(2) },
  chantierText: { fontFamily: font.semibold, fontSize: 14, color: colors["primary-strong"] },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.5 },
  text: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.label },
  thread: { gap: spacing(3) },
  empty: { fontFamily: font.regular, fontSize: 14, color: colors["muted-foreground"] },
  entry: { gap: spacing(1), maxWidth: "85%" },
  entryMine: { alignSelf: "flex-end", alignItems: "flex-end" },
  entryStaff: { alignSelf: "flex-start", alignItems: "flex-start" },
  who: { fontFamily: font.semibold, fontSize: 12, color: colors["muted-foreground"] },
  whoMine: { textAlign: "right" },
  bubble: { paddingVertical: spacing(3), paddingHorizontal: spacing(4), borderRadius: 18 },
  bubbleMine: { backgroundColor: colors.foreground, borderBottomRightRadius: 6 },
  bubbleStaff: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 6,
  },
  bubbleText: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.foreground },
  bubbleTextMine: { color: colors["primary-foreground"] },
  photo: { width: 200, height: 150, borderRadius: 14 },
  error: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: colors.danger },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: spacing(2) },
  round: {
    width: theme.touchTarget,
    height: theme.touchTarget,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    minHeight: theme.touchTarget,
    maxHeight: 140,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 11,
    fontFamily: font.regular,
    // 16 points au moins : pas de zoom de l'iPhone sur le champ.
    fontSize: 16,
    color: colors.foreground,
  },
  inputInvalid: { borderColor: colors.danger },
  send: {
    width: theme.touchTarget,
    height: theme.touchTarget,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
