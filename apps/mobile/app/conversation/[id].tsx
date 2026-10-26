import { isExampleId } from "@menao/core";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Fragment, useCallback, useEffect, useRef } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewInstance,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar } from "@/components/avatar";
import { Composer } from "@/components/messages/composer";
import { MessageBubble } from "@/components/messages/message-bubble";
import { DetailSkeleton } from "@/components/skeletons";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import {
  conversationScreenKey,
  loadConversation,
  markConversationRead,
  subscribeToConversation,
} from "@/lib/messages";
import { useSession } from "@/lib/session";
import { useUnread } from "@/lib/unread";
import { useFocusData } from "@/lib/use-focus-data";
import { readScreenPreview } from "@/lib/screen-cache";
import { Notice, Screen } from "@/ui";
import { theme } from "@/ui/theme";
import { ExampleLock } from "@/components/examples";

const t = fr.messages;
const { colors, font, radius, spacing } = theme;

/**
 * Conversation d'un chantier entre le client et son artisan (F-40), comme sur le site : messages du
 * plus ancien au plus récent, mis à jour en temps réel tant que l'écran est affiché, marqués lus
 * à l'affichage. Lecture seule si le chantier est annulé ou le devis refusé.
 */
export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { refresh } = useUnread();
  const artisan = useSession().space === "artisan";
  const load = useCallback(() => loadConversation(id, artisan), [id, artisan]);
  const [conversation, reload] = useFocusData(load, undefined, conversationScreenKey(id));
  const scrollRef = useRef<ScrollViewInstance>(null);
  const messages = conversation?.messages ?? [];
  const lastId = messages.at(-1)?.id ?? null;
  const lastReadMine = [...messages].reverse().find((m) => m.mine && m.read)?.id ?? null;

  // Temps réel : seulement tant que la conversation est affichée (F-40).
  useFocusEffect(
    useCallback(
      () =>
        subscribeToConversation(id, () => {
          void reload();
        }),
      [id, reload],
    ),
  );

  // Messages affichés : ceux de l'artisan sont lus, les pastilles sont relues.
  useEffect(() => {
    if (lastId) markConversationRead(id).then(refresh);
  }, [id, lastId, refresh]);

  if (conversation === undefined) {
    return <DetailSkeleton preview={readScreenPreview(conversationScreenKey(id))} />;
  }
  if (conversation === null) {
    return (
      <Screen onRefresh={reload} header={<TopBar />}>
        <Notice tone="error">{t.notFound}</Notice>
      </Screen>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TopBar />
        <View style={styles.person}>
          <Avatar url={conversation.avatarUrl} name={conversation.otherName} size={40} />
          <View style={styles.personText}>
            <Text role="heading" style={styles.name} numberOfLines={1}>
              {conversation.otherName}
            </Text>
            <Pressable
              role="link"
              hitSlop={8}
              onPress={() => router.push(conversation.chantierPath)}
            >
              <Text style={styles.chantier} numberOfLines={1}>
                {conversation.title} · <Text style={styles.link}>{t.seeChantier}</Text>
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollRef}
          aria-label={t.conversation(conversation.otherName)}
          contentContainerStyle={styles.messages}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.length === 0 ? (
            <Text style={styles.empty}>{t.noMessages(conversation.otherName)}</Text>
          ) : (
            messages.map((m, i) => (
              <Fragment key={m.id}>
                {i === 0 || messages[i - 1]?.day !== m.day ? (
                  <Text style={styles.day}>{m.day}</Text>
                ) : null}
                <MessageBubble message={m} showRead={m.id === lastReadMine} />
              </Fragment>
            ))
          )}
        </ScrollView>
        {conversation.closed ? (
          <Text style={styles.closed}>{t.closed}</Text>
        ) : (
          // Exemple (ADR 0184) : la conversation se lit, rien ne s'envoie.
          <ExampleLock locked={isExampleId(id)} note>
            <Composer chantierId={id} onSent={() => void reload()} />
          </ExampleLock>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    gap: spacing(2),
    paddingHorizontal: spacing(5),
    paddingTop: spacing(2),
    paddingBottom: spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  person: { flexDirection: "row", alignItems: "center", gap: spacing(3) },
  personText: { flex: 1, gap: 2 },
  name: { fontFamily: font.medium, fontSize: 17, color: colors.foreground },
  chantier: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  link: { fontFamily: font.medium, color: colors["primary-strong"] },
  messages: { flexGrow: 1, gap: spacing(3), padding: spacing(4) },
  empty: {
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    color: colors["muted-foreground"],
    paddingVertical: spacing(10),
  },
  day: {
    alignSelf: "center",
    overflow: "hidden",
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1),
    fontFamily: font.regular,
    fontSize: 12,
    color: colors["muted-foreground"],
  },
  closed: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing(4),
    fontFamily: font.regular,
    fontSize: 14,
    color: colors["muted-foreground"],
  },
});
