import { TICKET_MESSAGE_MAX_LENGTH } from "@menao/core";
import { useLocalSearchParams } from "expo-router";
import { Send } from "lucide-react-native";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { PageHead } from "@/components/pro/dossier-kit";
import { FicheButton, FicheScreen, FicheSkeleton, FicheTag } from "@/components/pro/fiche-kit";
import { ToolField } from "@/components/pro/tools-kit";
import { fr } from "@/i18n/fr";
import { addTicketMessage } from "@/lib/disputes";
import { formatDayAndTime } from "@/lib/format";
import { loadExchange } from "@/lib/support";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice, toast } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.clientHelp.exchanges;
const { colors, font, spacing } = theme;
const TONES = { ouvert: "primary", en_cours: "success", resolu: "neutral" } as const;

/**
 * Un échange avec l'équipe MENAO (lot 67, ADR 0361) : le message envoyé, les réponses, et une
 * réponse à écrire tant que l'échange n'est pas clos.
 */
export default function ExchangeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const load = useCallback(() => loadExchange(id), [id]);
  const [exchange, reload] = useFocusData(load);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (exchange === undefined) return <FicheSkeleton />;
  if (exchange === null) {
    return (
      <FicheScreen onRefresh={reload}>
        <Notice tone="error">{fr.errors.generic}</Notice>
      </FicheScreen>
    );
  }

  async function send() {
    const body = reply.trim();
    if (!body) return;
    setSending(true);
    setError(null);
    const failure = await addTicketMessage(id, body);
    setSending(false);
    if (failure) return setError(failure);
    setReply("");
    toast.success(t.replySent);
    await reload();
  }

  const when = (iso: string) => {
    const { day, time } = formatDayAndTime(iso);
    return `${day} · ${time}`;
  };
  const open = exchange.status !== "resolu";

  return (
    <FicheScreen
      keyboard
      onRefresh={reload}
      footer={
        open ? (
          <FicheButton
            label={t.reply}
            icon={Send}
            tall
            onPress={() => void send()}
            loading={sending}
            disabled={!reply.trim()}
          />
        ) : undefined
      }
    >
      <View style={styles.tag}>
        <FicheTag text={t.statuses[exchange.status]} tone={TONES[exchange.status]} />
      </View>
      <PageHead title={exchange.subject ?? t.untitled} />
      <View style={styles.thread}>
        <Bubble mine who={t.you} when={when(exchange.createdAt)} body={exchange.message} />
        {exchange.entries.map((entry) => (
          <Bubble
            key={entry.id}
            mine={!entry.fromStaff}
            who={entry.fromStaff ? t.team : t.you}
            when={when(entry.createdAt)}
            body={entry.body}
          />
        ))}
      </View>
      {error ? <Notice tone="error">{error}</Notice> : null}
      {open ? (
        <ToolField
          label={t.replyLabel}
          value={reply}
          onChangeText={setReply}
          multiline
          numberOfLines={3}
          maxLength={TICKET_MESSAGE_MAX_LENGTH}
        />
      ) : (
        <Text style={styles.closed}>{t.closed}</Text>
      )}
    </FicheScreen>
  );
}

function Bubble({
  mine,
  who,
  when,
  body,
}: {
  mine: boolean;
  who: string;
  when: string;
  body: string;
}) {
  return (
    <View style={[styles.entry, mine ? styles.entryMine : styles.entryTeam]}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTeam]}>
        <Text style={[styles.body, mine && styles.bodyMine]}>{body}</Text>
      </View>
      <Text style={styles.meta}>
        {who} · {when}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: { alignSelf: "flex-start" },
  thread: { gap: spacing(3) },
  entry: { maxWidth: "88%", gap: 4 },
  entryMine: { alignSelf: "flex-end", alignItems: "flex-end" },
  entryTeam: { alignSelf: "flex-start", alignItems: "flex-start" },
  bubble: { paddingVertical: spacing(3), paddingHorizontal: spacing(3.5), borderRadius: 18 },
  bubbleMine: { backgroundColor: colors.foreground, borderBottomRightRadius: 6 },
  bubbleTeam: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 6,
  },
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: colors.foreground },
  bodyMine: { color: colors["primary-foreground"] },
  meta: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
  closed: { fontFamily: font.regular, fontSize: 14, color: colors["muted-foreground"] },
});
