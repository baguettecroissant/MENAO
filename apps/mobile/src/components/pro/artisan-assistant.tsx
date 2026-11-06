import {
  ARTISAN_ASSISTANT_MAX_QUESTIONS,
  ARTISAN_ASSISTANT_QUESTION_MAX_LENGTH,
  type ArtisanAssistantMessage,
  type AssistantScreen,
} from "@menao/core";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { router, type Href } from "expo-router";
import { ArrowRight, Mail, RotateCcw, Send } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { fr } from "@/i18n/fr";
import { haptic } from "@/lib/haptics";
import { supabase } from "@/lib/supabase";
import { Card, Chip } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.help.assistant;
const { colors, font, radius, spacing } = theme;

/**
 * Écrans proposés par l'assistant, dans l'application (ADR 0236). La formule ne s'ouvre jamais
 * ici (aucun achat dans l'application, CLAUDE.md règle 10).
 */
const SCREEN_HREF: Partial<Record<AssistantScreen, string>> = {
  accueil: "/pro",
  demandes: "/pro/demandes",
  chantiers: "/pro/chantiers",
  agenda: "/pro-agenda",
  disponibilites: "/pro-disponibilites",
  messages: "/pro-messages",
  devis: "/pro/devis",
  factures: "/pro-factures",
  depenses: "/pro-depenses",
  comptable: "/pro-comptable",
  paiements: "/pro-paiements",
  fiche: "/pro-ma-fiche",
  documents: "/pro-documents",
  zone: "/pro-zone",
  metiers: "/pro-metiers",
  avis: "/pro-avis",
  grade: "/pro-grade",
  profil: "/compte",
};

type Message = ArtisanAssistantMessage & {
  suggestHuman?: boolean;
  suggestions?: readonly string[];
  screens?: readonly AssistantScreen[];
};

/**
 * Assistant de l'espace artisan (F-86, ADR 0236), en haut de « Aide et contact » : il connaît
 * l'espace et le compte de l'artisan, répond en quelques phrases et propose l'écran à ouvrir.
 * L'historique reste dans l'écran et n'est jamais conservé.
 */
export function ArtisanAssistant({ onWrite }: { onWrite: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [stopped, setStopped] = useState(false);

  const asked = messages.filter((m) => m.role === "user");
  const limitReached = stopped || asked.length >= ARTISAN_ASSISTANT_MAX_QUESTIONS;
  const last = messages[messages.length - 1];

  async function ask(text: string) {
    const clean = text.trim();
    if (!clean || pending || limitReached) return;
    haptic.select();
    const history = messages.map(({ role, text: content }) => ({ role, text: content }));
    const askedTexts = new Set(asked.map((m) => m.text));
    setMessages((current) => [...current, { role: "user", text: clean }]);
    setQuestion("");
    setPending(true);
    const { data, error } = await supabase.functions.invoke<{
      status: string;
      answer?: string;
      suggestHuman?: boolean;
      suggestions?: string[];
      screens?: AssistantScreen[];
    }>("artisan-assistant", { method: "POST", body: { question: clean, history } });
    setPending(false);
    if (!error && data?.status === "ok" && data.answer) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: data.answer ?? "",
          suggestHuman: data.suggestHuman ?? false,
          suggestions: (data.suggestions ?? []).filter((s) => !askedTexts.has(s)),
          screens: (data.screens ?? []).filter((s) => SCREEN_HREF[s]),
        },
      ]);
      return;
    }
    const limited = error instanceof FunctionsHttpError && error.context.status === 429;
    if (limited) setStopped(true);
    setMessages((current) => [
      ...current,
      { role: "assistant", text: limited ? t.limit : t.unavailable, suggestHuman: true },
    ]);
  }

  return (
    <Card>
      <View style={styles.head}>
        <Text role="heading" style={styles.heading}>
          {t.title}
        </Text>
        {messages.length > 0 ? (
          <Pressable
            role="button"
            aria-label={t.restart}
            onPress={() => {
              setMessages([]);
              setStopped(false);
            }}
            hitSlop={8}
          >
            <RotateCcw size={18} color={colors["muted-foreground"]} />
          </Pressable>
        ) : null}
      </View>

      {messages.length === 0 ? (
        <View style={styles.chips}>
          {t.quick.map((item) => (
            <Chip key={item} label={item} onPress={() => void ask(item)} />
          ))}
        </View>
      ) : (
        <View style={styles.thread} aria-live="polite">
          {messages.map((m, i) => (
            <View key={i} style={styles.turn}>
              <View style={[styles.bubble, m.role === "user" ? styles.mine : styles.theirs]}>
                <Text style={m.role === "user" ? styles.mineText : styles.theirsText}>
                  {m.text}
                </Text>
              </View>
              {m.role === "assistant"
                ? m.screens?.map((screen) => (
                    <Pressable
                      key={screen}
                      role="button"
                      onPress={() => router.push(SCREEN_HREF[screen] as Href)}
                      style={styles.screen}
                    >
                      <Text style={styles.screenText}>{t.screens[screen] ?? screen}</Text>
                      <ArrowRight size={16} color={colors["primary-strong"]} />
                    </Pressable>
                  ))
                : null}
              {m.role === "assistant" && m.suggestHuman ? (
                <Pressable role="button" onPress={onWrite} style={styles.write}>
                  <Mail size={16} color={colors["primary-strong"]} />
                  <Text style={styles.screenText}>{t.writeTeam}</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
          {pending ? (
            <View style={[styles.bubble, styles.theirs]}>
              <ActivityIndicator color={colors["muted-foreground"]} accessibilityLabel={t.typing} />
            </View>
          ) : null}
          {!pending && last?.role === "assistant" && !limitReached && last.suggestions?.length ? (
            <View style={styles.chips}>
              {last.suggestions.map((item) => (
                <Chip key={item} label={item} onPress={() => void ask(item)} />
              ))}
            </View>
          ) : null}
        </View>
      )}

      {!limitReached ? (
        <View style={styles.composer}>
          <TextInput
            value={question}
            onChangeText={setQuestion}
            placeholder={t.placeholder}
            placeholderTextColor={colors["subtle-foreground"]}
            aria-label={t.label}
            maxLength={ARTISAN_ASSISTANT_QUESTION_MAX_LENGTH}
            onSubmitEditing={() => void ask(question)}
            returnKeyType="send"
            editable={!pending}
            style={styles.input}
          />
          <Pressable
            role="button"
            aria-label={t.send}
            aria-disabled={pending || !question.trim()}
            disabled={pending || !question.trim()}
            onPress={() => void ask(question)}
            style={[styles.send, (pending || !question.trim()) && styles.sendDisabled]}
          >
            <Send size={18} color={colors["primary-foreground"]} />
          </Pressable>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heading: { fontFamily: font.bold, fontSize: 17, color: colors.foreground },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  thread: { gap: spacing(3) },
  turn: { gap: spacing(2) },
  bubble: {
    maxWidth: "90%",
    borderRadius: radius.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  mine: { alignSelf: "flex-end", backgroundColor: colors.primary },
  theirs: { alignSelf: "flex-start", backgroundColor: colors.background },
  mineText: {
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 21,
    color: colors["primary-foreground"],
  },
  theirsText: { fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: colors.foreground },
  screen: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing(1.5),
    minHeight: theme.touchTarget,
    paddingHorizontal: spacing(3.5),
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  write: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing(1.5),
    minHeight: theme.touchTarget,
  },
  screenText: { fontFamily: font.medium, fontSize: 14, color: colors["primary-strong"] },
  composer: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  input: {
    flex: 1,
    minHeight: theme.touchTarget,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors["border-strong"],
    paddingHorizontal: spacing(3),
    fontFamily: font.regular,
    // 16 points au moins : pas de zoom automatique sur iPhone.
    fontSize: 16,
    color: colors.foreground,
    backgroundColor: colors.surface,
  },
  send: {
    alignItems: "center",
    justifyContent: "center",
    width: theme.touchTarget,
    height: theme.touchTarget,
    borderRadius: radius.input,
    backgroundColor: colors.primary,
  },
  sendDisabled: { opacity: 0.5 },
});
