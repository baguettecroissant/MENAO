import { router } from "expo-router";
import { ChevronRight, Lock, Send } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { PageHead } from "@/components/pro/dossier-kit";
import { FicheButton, FicheScreen } from "@/components/pro/fiche-kit";
import { ToolField } from "@/components/pro/tools-kit";
import { fr } from "@/i18n/fr";
import { loadMyChantiers } from "@/lib/chantiers";
import { haptic } from "@/lib/haptics";
import { useSession } from "@/lib/session";
import { loadExchanges, sendContactMessage } from "@/lib/support";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice, Tappable, toast } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.clientHelp.contact;
const { colors, font, spacing } = theme;
const SUBJECTS = ["question", "chantier", "compte", "autre"] as const;
type Subject = (typeof SUBJECTS)[number];
const MESSAGE_MAX = 2000;
const nothing = async () => null;

/**
 * « Écrire à l'équipe MENAO » dans l'application (lot 67, ADR 0361) : le sujet en pastilles, le
 * chantier concerné s'il y en a un, le message. Le compte connecté est joint par la base ; un
 * visiteur donne son adresse e-mail. La réponse arrive dans « Mes échanges avec MENAO ».
 */
export default function Contact() {
  const { signedIn, session } = useSession();
  // Visiteur : ni chantiers ni échanges à lire.
  const [mine] = useFocusData(signedIn ? loadMyChantiers : nothing);
  const [exchanges] = useFocusData(signedIn ? loadExchanges : nothing);
  const [subject, setSubject] = useState<Subject>("question");
  const [chantier, setChantier] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const chantiers = (mine?.chantiers ?? []).slice(0, 6);
  const unread = (exchanges ?? []).filter((e) => e.status === "en_cours").length;

  async function send() {
    const body = message.trim();
    const address = signedIn ? (session?.user.email ?? "") : email.trim();
    if (!body) return setError(t.messageRequired);
    if (!address) return setError(t.emailRequired);
    const title = chantiers.find((c) => c.chantier_id === chantier)?.title;
    const label =
      subject === "chantier" && title ? `${t.subjects.chantier} : ${title}` : t.subjects[subject];
    setSending(true);
    setError(null);
    const failure = await sendContactMessage({ email: address, subject: label, message: body });
    setSending(false);
    if (failure) return setError(failure);
    toast.success(t.sent);
    if (signedIn) router.replace("/echanges");
    else router.back();
  }

  return (
    <FicheScreen
      keyboard
      footer={
        <FicheButton
          label={t.send}
          icon={Send}
          tall
          onPress={() => void send()}
          loading={sending}
        />
      }
    >
      <PageHead title={t.title} lead={t.intro} />
      {error ? <Notice tone="error">{error}</Notice> : null}
      <View style={styles.block}>
        <Text style={styles.label}>{t.about}</Text>
        <View role="radiogroup" aria-label={t.about} style={styles.chips}>
          {SUBJECTS.filter((s) => s !== "chantier" || chantiers.length > 0).map((s) => {
            const on = s === subject;
            return (
              <Pressable
                key={s}
                role="radio"
                aria-checked={on}
                onPress={() => {
                  haptic.select();
                  setSubject(s);
                }}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{t.subjects[s]}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      {subject === "chantier" && chantiers.length > 0 ? (
        <View style={styles.block}>
          <Text style={styles.label}>{t.which}</Text>
          <View role="radiogroup" aria-label={t.which} style={styles.chips}>
            {chantiers.map((c) => {
              const on = c.chantier_id === chantier;
              return (
                <Pressable
                  key={c.chantier_id}
                  role="radio"
                  aria-checked={on}
                  onPress={() => {
                    haptic.select();
                    setChantier(c.chantier_id);
                  }}
                  style={[styles.chip, on && styles.chipOn]}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]} numberOfLines={1}>
                    {c.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
      {signedIn ? null : (
        <ToolField
          label={t.email}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          hint={t.emailHint}
        />
      )}
      <ToolField
        label={t.message}
        value={message}
        onChangeText={setMessage}
        multiline
        numberOfLines={5}
        maxLength={MESSAGE_MAX}
      />
      {signedIn ? (
        <View style={styles.note}>
          <Lock size={15} color={colors["muted-foreground"]} />
          <Text style={styles.noteText}>{t.joined}</Text>
        </View>
      ) : null}
      {signedIn ? (
        <Tappable role="link" onPress={() => router.push("/echanges")} style={styles.exchanges}>
          <View style={styles.exchangesText}>
            <Text style={styles.exchangesTitle}>{fr.clientHelp.exchanges.title}</Text>
            {unread > 0 ? (
              <Text style={styles.noteText}>{fr.clientHelp.exchanges.unread(unread)}</Text>
            ) : null}
          </View>
          <ChevronRight size={20} color={colors["muted-foreground"]} />
        </Tappable>
      ) : null}
    </FicheScreen>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing(2) },
  label: { fontFamily: font.bold, fontSize: 14, color: colors.foreground },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  chip: {
    maxWidth: "100%",
    height: 38,
    paddingHorizontal: spacing(3.5),
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors["border-strong"],
    backgroundColor: colors.surface,
    justifyContent: "center",
  },
  chipOn: { borderColor: colors.foreground, backgroundColor: colors.foreground },
  chipText: { fontFamily: font.semibold, fontSize: 13.5, color: colors.foreground },
  chipTextOn: { color: colors["primary-foreground"] },
  note: { flexDirection: "row", alignItems: "flex-start", gap: spacing(2) },
  noteText: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
  exchanges: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    paddingVertical: spacing(3.5),
    paddingHorizontal: spacing(4),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  exchangesText: { flex: 1, gap: 2 },
  exchangesTitle: { fontFamily: font.bold, fontSize: 15, color: colors.foreground },
});
