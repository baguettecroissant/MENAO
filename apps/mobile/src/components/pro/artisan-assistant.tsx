import {
  ARTISAN_ASSISTANT_MAX_QUESTIONS,
  ARTISAN_ASSISTANT_QUESTION_MAX_LENGTH,
  type ArtisanAssistantMessage,
  type AssistantScreen,
} from "@menao/core";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { router, type Href } from "expo-router";
import { ArrowRight, Mail, RotateCcw, Send, Sparkles } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { fr } from "@/i18n/fr";
import { haptic } from "@/lib/haptics";
import { supabase } from "@/lib/supabase";
import { theme } from "@/ui/theme";
import { IconSquare } from "./tools-kit";

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
 * L'historique reste dans l'écran et n'est jamais conservé. Refonte « Nette » (lot 8) : une carte
 * avec en-tête, bulles (les questions en bleu nuit à droite), questions en pastilles bleu clair et
 * barre d'écriture arrondie.
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
    <View style={styles.card}>
      <View style={styles.head}>
        <IconSquare icon={Sparkles} />
        <View style={styles.headText}>
          <Text role="heading" style={styles.heading}>
            {t.name}
          </Text>
          <Text style={styles.knows}>{t.knows}</Text>
        </View>
        {messages.length > 0 ? (
          <Pressable
            role="button"
            aria-label={t.restart}
            onPress={() => {
              setMessages([]);
              setStopped(false);
            }}
            hitSlop={8}
            style={styles.restart}
          >
            <RotateCcw size={18} color={colors["muted-foreground"]} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.body}>
        {messages.length > 0 ? (
          <View style={styles.thread} aria-live="polite">
            {messages.map((m, i) => (
              <View key={i} style={styles.turn}>
                <View style={[styles.bubble, m.role === "user" ? styles.mine : styles.theirs]}>
                  <Text style={m.role === "user" ? styles.mineText : styles.theirsText}>
                    {m.text}
                  </Text>
                </View>
                {m.role === "assistant" && (m.screens?.length || m.suggestHuman) ? (
                  <View style={styles.actions}>
                    {m.screens?.map((screen) => (
                      <Pressable
                        key={screen}
                        role="button"
                        onPress={() => router.push(SCREEN_HREF[screen] as Href)}
                        style={({ pressed }) => [styles.action, pressed && styles.pressed]}
                      >
                        <Text style={styles.actionText}>{t.screens[screen] ?? screen}</Text>
                        <ArrowRight size={15} color={colors.foreground} />
                      </Pressable>
                    ))}
                    {m.suggestHuman ? (
                      <Pressable
                        role="button"
                        onPress={onWrite}
                        style={({ pressed }) => [styles.action, pressed && styles.pressed]}
                      >
                        <Mail size={15} color={colors.foreground} />
                        <Text style={styles.actionText}>{t.writeTeam}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ))}
            {pending ? (
              <View style={[styles.bubble, styles.theirs]}>
                <ActivityIndicator
                  color={colors["muted-foreground"]}
                  accessibilityLabel={t.typing}
                />
              </View>
            ) : null}
          </View>
        ) : null}

        {messages.length === 0 ? (
          <View style={styles.quick}>
            <Text style={styles.quickTitle}>{t.quickTitle}</Text>
            <Suggestions items={t.quick} onAsk={(item) => void ask(item)} />
          </View>
        ) : !pending && last?.role === "assistant" && !limitReached && last.suggestions?.length ? (
          <Suggestions items={last.suggestions} onAsk={(item) => void ask(item)} />
        ) : null}
      </View>

      {!limitReached ? (
        <View style={styles.composer}>
          <TextInput
            value={question}
            onChangeText={setQuestion}
            placeholder={t.placeholder}
            placeholderTextColor={colors["muted-foreground"]}
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
            <Send size={18} color={colors["primary-foreground"]} strokeWidth={2.2} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

/** Questions proposées, en pastilles bleu clair. */
function Suggestions({
  items,
  onAsk,
}: {
  items: readonly string[];
  onAsk: (item: string) => void;
}) {
  return (
    <View style={styles.chips}>
      {items.map((item) => (
        <Pressable
          key={item}
          role="button"
          onPress={() => onAsk(item)}
          style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
        >
          <Text style={styles.chipText}>{item}</Text>
        </Pressable>
      ))}
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
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(4),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headText: { flex: 1, gap: 1 },
  heading: { fontFamily: font.bold, fontSize: 16, color: colors.foreground },
  knows: { fontFamily: font.semibold, fontSize: 13, color: colors.success },
  restart: {
    width: theme.touchTarget,
    height: theme.touchTarget,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -spacing(2),
  },
  body: { gap: spacing(3), paddingHorizontal: spacing(4), paddingVertical: spacing(5) },
  thread: { gap: spacing(3) },
  turn: { gap: spacing(2) },
  bubble: {
    maxWidth: "88%",
    borderRadius: 18,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
  },
  mine: { alignSelf: "flex-end", borderBottomRightRadius: 6, backgroundColor: colors.foreground },
  theirs: {
    alignSelf: "flex-start",
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  mineText: {
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors["primary-foreground"],
  },
  theirsText: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.foreground },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.5),
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors["border-strong"],
    backgroundColor: colors.surface,
  },
  actionText: { fontFamily: font.semibold, fontSize: 14, color: colors.foreground },
  pressed: { opacity: 0.7 },
  quick: { gap: spacing(2) },
  quickTitle: { fontFamily: font.semibold, fontSize: 13, color: colors["muted-foreground"] },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  chip: {
    maxWidth: "100%",
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: spacing(1.5),
    borderRadius: 18,
    backgroundColor: colors["primary-soft"],
  },
  chipText: { fontFamily: font.semibold, fontSize: 14, color: colors["primary-strong"] },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2.5),
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing(4),
    fontFamily: font.regular,
    // 16 points au moins : pas de zoom automatique sur iPhone.
    fontSize: 16,
    color: colors.foreground,
    backgroundColor: colors.background,
  },
  send: {
    alignItems: "center",
    justifyContent: "center",
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
  },
  sendDisabled: { opacity: 0.5 },
});
