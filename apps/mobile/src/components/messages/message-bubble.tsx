import { REVIEW_REPORT_LIMITS } from "@menao/core";
import { messageReportSchema } from "@menao/validation";
import * as WebBrowser from "expo-web-browser";
import { FileText, Flag } from "lucide-react-native";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { PhotoViewer } from "@/components/photo-viewer";
import { fr } from "@/i18n/fr";
import { reportMessage, type ConversationMessage } from "@/lib/messages";
import { Button, Notice, TextField } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.messages;
const { colors, font, radius, spacing } = theme;

/**
 * Un message de la conversation (F-40) : les siens à droite, ceux de l'artisan à gauche, heure et
 * « Lu » sous son dernier message lu. Les photos s'ouvrent en grand, les PDF dans le navigateur
 * (URL signées).
 */
export function MessageBubble({
  message: m,
  showRead,
}: {
  message: ConversationMessage;
  /** Son dernier message lu par l'artisan. */
  showRead: boolean;
}) {
  return (
    <View style={[styles.item, m.mine ? styles.mine : styles.theirs]}>
      <Content message={m} />
      <Text style={styles.time}>
        {m.time}
        {showRead ? ` · ${t.read}` : ""}
      </Text>
      {!m.mine && !m.hidden ? <ReportMessage messageId={m.id} /> : null}
    </View>
  );
}

function Content({ message: m }: { message: ConversationMessage }) {
  if (m.hidden) {
    return (
      <View style={styles.hidden}>
        <Text style={styles.hiddenText}>{t.hidden}</Text>
      </View>
    );
  }
  if (m.kind === "photo" && m.url) return <PhotoMessage url={m.url} />;
  if (m.kind === "fichier" && m.url) {
    const url = m.url;
    return (
      <Pressable
        role="link"
        aria-label={t.openFile}
        onPress={() => WebBrowser.openBrowserAsync(url)}
        style={[styles.bubble, styles.file, m.mine ? styles.bubbleMine : styles.bubbleTheirs]}
      >
        <FileText size={16} color={m.mine ? colors["primary-foreground"] : colors.foreground} />
        <Text style={[styles.bubbleText, m.mine && styles.bubbleTextMine, styles.fileText]}>
          {t.file}
        </Text>
      </Pressable>
    );
  }
  return (
    <View style={[styles.bubble, m.mine ? styles.bubbleMine : styles.bubbleTheirs]}>
      <Text selectable style={[styles.bubbleText, m.mine && styles.bubbleTextMine]}>
        {m.body}
      </Text>
    </View>
  );
}

/** Photo envoyée : ouverte en grand d'un appui. */
function PhotoMessage({ url }: { url: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        role="button"
        aria-label={t.openPhoto}
        onPress={() => setOpen(true)}
        style={styles.photoFrame}
      >
        <Image source={{ uri: url }} style={styles.photo} resizeMode="cover" alt="" />
      </Pressable>
      <PhotoViewer photos={[url]} index={open ? 0 : null} onClose={() => setOpen(false)} />
    </>
  );
}

/** « Signaler ce message » : motif transmis à l'équipe MENAO (ticket « Message signalé »). */
function ReportMessage({ messageId }: { messageId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    const parsed = messageReportSchema.safeParse({ reason });
    if (!parsed.success) {
      setError(z.flattenError(parsed.error).fieldErrors.reason?.[0]);
      return;
    }
    setError(undefined);
    setFailure(null);
    setPending(true);
    const failed = await reportMessage(messageId, parsed.data.reason);
    setPending(false);
    if (failed) return setFailure(failed);
    setSent(true);
  }

  if (sent) return <Notice tone="success">{t.reportSent}</Notice>;
  if (!open) {
    return (
      <Pressable role="button" hitSlop={8} onPress={() => setOpen(true)} style={styles.reportLink}>
        <Flag size={12} color={colors["muted-foreground"]} />
        <Text style={styles.time}>{t.report}</Text>
      </Pressable>
    );
  }
  return (
    <View style={styles.report}>
      <TextField
        label={t.reportLabel}
        hint={t.reportHint}
        value={reason}
        onChangeText={(value) => {
          setReason(value);
          setError(undefined);
        }}
        maxLength={REVIEW_REPORT_LIMITS.max}
        multiline
        error={error}
      />
      {failure ? <Notice tone="error">{failure}</Notice> : null}
      <Button label={t.reportSubmit} onPress={submit} loading={pending} />
      <Button label={t.reportCancel} variant="ghost" onPress={() => setOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  item: { maxWidth: "85%", gap: spacing(1) },
  mine: { alignSelf: "flex-end", alignItems: "flex-end" },
  theirs: { alignSelf: "flex-start", alignItems: "flex-start" },
  bubble: {
    borderRadius: radius.card,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2.5),
  },
  bubbleMine: { backgroundColor: colors.primary },
  bubbleTheirs: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  bubbleText: { fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: colors.foreground },
  bubbleTextMine: { color: colors["primary-foreground"] },
  file: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
    minHeight: theme.touchTarget,
  },
  fileText: { fontFamily: font.medium, textDecorationLine: "underline" },
  photoFrame: {
    overflow: "hidden",
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  photo: { width: 220, height: 165 },
  hidden: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors["border-strong"],
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2.5),
  },
  hiddenText: {
    fontFamily: font.regular,
    fontSize: 14,
    fontStyle: "italic",
    color: colors["muted-foreground"],
  },
  time: { fontFamily: font.regular, fontSize: 11, color: colors["muted-foreground"] },
  reportLink: { flexDirection: "row", alignItems: "center", gap: spacing(1) },
  report: {
    width: 288,
    maxWidth: "100%",
    gap: spacing(2),
    borderRadius: radius.input,
    backgroundColor: colors.surface,
    padding: spacing(3),
  },
});
