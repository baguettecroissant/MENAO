import { PRO_ASSISTANT_MAX_QUESTIONS, PRO_ASSISTANT_QUESTION_MAX_LENGTH } from "@menao/core";
import type { ClientDraft } from "@menao/core";
import { router } from "expo-router";
import { ArrowRight, Mail } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { FicheButton, FicheScreen } from "@/components/pro/fiche-kit";
import { fr } from "@/i18n/fr";
import { haptic } from "@/lib/haptics";
import { askClientAssistant, type AssistantTurn } from "@/lib/support";
import { theme } from "@/ui/theme";

const t = fr.clientHelp.assistantChat;
const { colors, font, spacing } = theme;

type Message = AssistantTurn & {
  suggestions?: string[];
  suggestHuman?: boolean;
  draft?: ClientDraft | null;
};

/**
 * Assistant des particuliers dans l'application (lot 67, ADR 0361), version simple : il répond aux
 * questions à partir des contenus publiés de MENAO, comme sur le site (F-71), sans lire le compte.
 * Une demande préparée s'ouvre dans la recherche ; l'historique reste dans l'écran.
 */
export default function Assistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [stopped, setStopped] = useState(false);
  const asked = messages.filter((m) => m.role === "user");
  const limitReached = stopped || asked.length >= PRO_ASSISTANT_MAX_QUESTIONS;
  const askedTexts = new Set(asked.map((m) => m.text));
  const last = messages[messages.length - 1];

  async function send(value: string) {
    const clean = value.trim();
    if (!clean || pending || limitReached) return;
    haptic.select();
    const history = messages.map(({ role, text: content }) => ({ role, text: content }));
    setMessages((current) => [...current, { role: "user", text: clean }]);
    setText("");
    setPending(true);
    const reply = await askClientAssistant(clean, history);
    setPending(false);
    if (reply.status === "ok") {
      return setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: reply.answer,
          suggestions: reply.suggestions,
          suggestHuman: reply.suggestHuman,
          draft: reply.draft,
        },
      ]);
    }
    if (reply.status === "limit") setStopped(true);
    setMessages((current) => [
      ...current,
      {
        role: "assistant",
        text: reply.status === "limit" ? t.limit : t.unavailable,
        suggestHuman: true,
      },
    ]);
  }

  const chips = (items: readonly string[]) => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.bleed}
      contentContainerStyle={styles.bleedContent}
    >
      {items.map((item) => (
        <Pressable
          key={item}
          role="button"
          onPress={() => void send(item)}
          style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
        >
          <Text style={styles.chipText}>{item}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );

  return (
    <FicheScreen
      title={t.title}
      keyboard
      footer={
        limitReached ? undefined : (
          <View style={styles.bar}>
            <TextInput
              aria-label={t.inputLabel}
              value={text}
              onChangeText={setText}
              placeholder={t.placeholder}
              placeholderTextColor={colors["muted-foreground"]}
              maxLength={PRO_ASSISTANT_QUESTION_MAX_LENGTH}
              returnKeyType="send"
              onSubmitEditing={() => void send(text)}
              style={styles.input}
            />
            <Pressable
              role="button"
              aria-label={t.send}
              disabled={!text.trim() || pending}
              onPress={() => void send(text)}
              style={({ pressed }) => [
                styles.send,
                (!text.trim() || pending) && styles.sendOff,
                pressed && styles.pressed,
              ]}
            >
              <ArrowRight size={20} strokeWidth={2.4} color={colors["primary-foreground"]} />
            </Pressable>
          </View>
        )
      }
    >
      <View style={styles.thread}>
        <View style={[styles.bubble, styles.bubbleTeam]}>
          <Text style={styles.body}>{t.greeting}</Text>
        </View>
        {messages.map((message, index) => (
          <View key={index} style={styles.turn}>
            <View
              style={[
                styles.bubble,
                message.role === "user" ? styles.bubbleMine : styles.bubbleTeam,
              ]}
            >
              <Text style={[styles.body, message.role === "user" && styles.bodyMine]}>
                {message.text}
              </Text>
            </View>
            {message.draft ? (
              <View style={styles.draft}>
                <Text style={styles.draftTitle}>{t.draft.title}</Text>
                <Text style={styles.body}>{message.draft.description}</Text>
                <FicheButton
                  label={t.draft.use}
                  icon={ArrowRight}
                  onPress={() =>
                    router.push({
                      pathname: "/recherche",
                      params: {
                        texte: message.draft?.description ?? "",
                        ...(message.draft?.trade ? { metier: message.draft.trade } : {}),
                      },
                    })
                  }
                />
                <Text style={styles.note}>{t.draft.hint}</Text>
              </View>
            ) : null}
            {message.suggestHuman ? (
              <FicheButton
                label={t.write}
                icon={Mail}
                variant="secondary"
                onPress={() => router.push("/contact")}
              />
            ) : null}
          </View>
        ))}
        {pending ? (
          <View style={[styles.bubble, styles.bubbleTeam, styles.typing]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.note}>{t.thinking}</Text>
          </View>
        ) : null}
      </View>
      {messages.length === 0 ? chips(t.quick) : null}
      {!pending && !limitReached && last?.role === "assistant" && last.suggestions?.length
        ? chips(last.suggestions.filter((s) => !askedTexts.has(s)))
        : null}
      <Text style={styles.note}>{t.disclaimer}</Text>
    </FicheScreen>
  );
}

const styles = StyleSheet.create({
  thread: { gap: spacing(2.5) },
  turn: { gap: spacing(2.5) },
  bubble: {
    maxWidth: "86%",
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(3.5),
    borderRadius: 18,
  },
  bubbleMine: {
    alignSelf: "flex-end",
    backgroundColor: colors.primary,
    borderBottomRightRadius: 6,
  },
  bubbleTeam: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 6,
  },
  typing: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: colors.foreground },
  bodyMine: { color: colors["primary-foreground"] },
  draft: {
    gap: spacing(2.5),
    padding: spacing(4),
    borderRadius: 18,
    backgroundColor: colors["primary-soft"],
  },
  draftTitle: { fontFamily: font.bold, fontSize: 15, color: colors["primary-strong"] },
  note: {
    fontFamily: font.regular,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
  bleed: { marginHorizontal: -spacing(4), flexGrow: 0 },
  bleedContent: { paddingHorizontal: spacing(4), gap: spacing(2) },
  chip: {
    height: 36,
    paddingHorizontal: spacing(3.5),
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors["border-strong"],
    backgroundColor: colors.surface,
    justifyContent: "center",
  },
  chipText: { fontFamily: font.medium, fontSize: 13.5, color: colors.foreground },
  pressed: { opacity: 0.8 },
  bar: { flexDirection: "row", alignItems: "center", gap: spacing(2.5) },
  input: {
    flex: 1,
    height: 48,
    paddingHorizontal: spacing(4),
    borderRadius: 24,
    backgroundColor: colors.background,
    fontFamily: font.regular,
    fontSize: 16,
    color: colors.foreground,
  },
  send: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendOff: { opacity: 0.45 },
});
