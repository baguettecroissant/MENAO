import { isExampleId } from "@menao/core";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { ChevronLeft, Phone } from "lucide-react-native";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
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
import { PushDeniedNotice } from "@/components/push-prompt";
import { DetailSkeleton } from "@/components/skeletons";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import {
  conversationScreenKey,
  loadConversation,
  markConversationRead,
  subscribeToConversation,
} from "@/lib/messages";
import { goBack } from "@/lib/navigation";
import { setVisibleConversation } from "@/lib/push";
import { useSession } from "@/lib/session";
import { useUnread } from "@/lib/unread";
import { useFocusData } from "@/lib/use-focus-data";
import { readScreenPreview } from "@/lib/screen-cache";
import { Notice, Screen, Tappable } from "@/ui";
import { theme } from "@/ui/theme";
import { ExampleLock } from "@/components/examples";

const t = fr.messages;
const { colors, font, radius, spacing } = theme;

/**
 * Conversation d'un chantier entre le client et son artisan (F-40), comme sur le site : messages du
 * plus ancien au plus récent, mis à jour en temps réel tant que l'écran est affiché, marqués lus
 * à l'affichage. Lecture seule si le chantier est annulé ou le devis refusé. Refonte « Nette »
 * (lot 4) : en-tête blanc (retour, avatar, nom, « Chantier › », « Appeler » si le numéro est
 * connu), fil sur fond crème, barre d'écriture en bas.
 */
export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { refresh } = useUnread();
  const artisan = useSession().space === "artisan";
  const load = useCallback(() => loadConversation(id, artisan), [id, artisan]);
  const [conversation, reload] = useFocusData(load, undefined, conversationScreenKey(id));
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [sending, setSending] = useState<{ id: string; body: string }[]>([]);
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

  // Conversation à l'écran : ses nouveaux messages n'y sonnent pas (ADR 0201).
  useFocusEffect(
    useCallback(() => {
      setVisibleConversation(id);
      return () => setVisibleConversation(null);
    }, [id]),
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

  const phone = conversation.phone;
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <View style={styles.person}>
          <Pressable
            role="button"
            aria-label={fr.nav.back}
            onPress={goBack}
            hitSlop={8}
            style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
          >
            <ChevronLeft size={26} strokeWidth={2.2} color={colors.foreground} />
          </Pressable>
          <Avatar url={conversation.avatarUrl} name={conversation.otherName} size={42} initials />
          <View style={styles.personText}>
            <Text role="heading" style={styles.name} numberOfLines={1}>
              {conversation.otherName}
            </Text>
            <Pressable
              role="link"
              aria-label={`${conversation.title}, ${t.seeChantier}`}
              hitSlop={8}
              onPress={() => router.push(conversation.chantierPath)}
            >
              <Text style={styles.chantier} numberOfLines={1}>
                {`${conversation.title} ›`}
              </Text>
            </Pressable>
          </View>
          {phone ? (
            <ExampleLock locked={isExampleId(id)}>
              <Tappable
                role="button"
                aria-label={t.call(conversation.otherName)}
                onPress={() => Linking.openURL(`tel:${phone}`)}
                style={styles.call}
              >
                <Phone size={20} color={colors.foreground} />
              </Tappable>
            </ExampleLock>
          ) : null}
        </View>
        <PushDeniedNotice />
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
          {/* Envoi instantané (ADR 0195) : le message s'affiche avant la réponse du serveur. */}
          {sending.map((p) => (
            <View key={p.id} style={styles.sending}>
              <MessageBubble
                message={{
                  id: p.id,
                  mine: true,
                  kind: "texte",
                  body: p.body,
                  url: null,
                  hidden: false,
                  read: false,
                  day: "",
                  time: t.sending,
                }}
                showRead={false}
              />
            </View>
          ))}
        </ScrollView>
        {conversation.closed ? (
          <Text style={styles.closed}>{t.closed}</Text>
        ) : (
          // Exemple (ADR 0184) : la conversation se lit, rien ne s'envoie.
          <ExampleLock locked={isExampleId(id)} note>
            <Composer
              chantierId={id}
              placeholder={t.writeTo(conversation.shortName || conversation.otherName)}
              onSent={reload}
              onPending={(body) => {
                const key = `envoi-${Date.now()}`;
                setSending((list) => [...list, { id: key, body }]);
                return () => setSending((list) => list.filter((p) => p.id !== key));
              }}
            />
          </ExampleLock>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Haut blanc (en-tête), fil sur fond crème.
  safe: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1, backgroundColor: colors.background },
  sending: { opacity: 0.6 },
  header: {
    gap: spacing(2),
    paddingLeft: spacing(1),
    paddingRight: spacing(3),
    paddingTop: spacing(1),
    paddingBottom: spacing(3),
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  person: { flexDirection: "row", alignItems: "center", gap: spacing(3) },
  back: {
    width: 40,
    height: theme.touchTarget,
    marginRight: -spacing(1),
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  backPressed: { backgroundColor: colors["primary-soft"] },
  personText: { flex: 1, minWidth: 0 },
  name: { fontFamily: font.bold, fontSize: 16, color: colors.foreground },
  chantier: { fontFamily: font.semibold, fontSize: 13, color: colors["primary-strong"] },
  call: {
    width: theme.touchTarget,
    height: theme.touchTarget,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  messages: { flexGrow: 1, gap: spacing(3), paddingHorizontal: spacing(4), paddingVertical: 18 },
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
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 3,
    fontFamily: font.semibold,
    fontSize: 12,
    color: colors["muted-foreground"],
  },
  closed: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing(4),
    fontFamily: font.regular,
    fontSize: 14,
    color: colors["muted-foreground"],
  },
});
