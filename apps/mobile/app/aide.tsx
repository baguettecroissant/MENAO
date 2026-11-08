import * as Linking from "expo-linking";
import { ChevronDown, Mail } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeIn,
  ReduceMotion,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { ArtisanAssistant } from "@/components/pro/artisan-assistant";
import { CardHeading, FicheButton, FicheCard, FicheScreen } from "@/components/pro/fiche-kit";
import { fr } from "@/i18n/fr";
import { haptic } from "@/lib/haptics";
import { useSession } from "@/lib/session";
import { Tappable, toast } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.help;
const { colors, font, radius, spacing } = theme;

/**
 * « Aide et contact » de l'artisan (ADR 0129), refonte « Nette » (lot 8, maquette « AideApp ») :
 * la carte de l'assistant de l'espace artisan (ADR 0236), la carte « Écrire à l'équipe MENAO »
 * (réponse par e-mail), puis les questions fréquentes dépliables ; sans lien vers le site
 * (CLAUDE.md règle 10).
 */
export default function Aide() {
  const { role } = useSession();
  async function write() {
    const url = `mailto:${t.email}?subject=${encodeURIComponent(t.subject)}`;
    const ok = await Linking.canOpenURL(url).catch(() => false);
    if (!ok) return toast.info(t.noMail);
    await Linking.openURL(url);
  }

  return (
    <FicheScreen title={t.title}>
      {role === "artisan" ? <ArtisanAssistant onWrite={() => void write()} /> : null}
      <FicheCard padding={4.5} gap={2.5}>
        <CardHeading title={t.contactTitle} size={16} />
        <Text style={styles.lead}>{t.contactLead}</Text>
        <Text selectable style={styles.email}>
          {t.email}
        </Text>
        <FicheButton label={t.writeTeam} variant="secondary" icon={Mail} onPress={write} />
      </FicheCard>
      <Text role="heading" style={styles.faqTitle}>
        {t.faqTitle}
      </Text>
      <View style={styles.list}>
        {t.faq.map((item) => (
          <Question key={item.q} question={item.q} answer={item.a} />
        ))}
      </View>
    </FicheScreen>
  );
}

function Question({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  const chevron = useAnimatedStyle(() => ({
    transform: [{ rotate: withTiming(open ? "180deg" : "0deg", { duration: 200 }) }],
  }));
  return (
    <View style={styles.item}>
      <Tappable
        role="button"
        aria-expanded={open}
        aria-label={question}
        onPress={() => {
          haptic.select();
          setOpen((value) => !value);
        }}
        scaleTo={0.985}
        style={styles.question}
      >
        <Text style={styles.questionText}>{question}</Text>
        <Animated.View style={chevron}>
          <ChevronDown size={20} color={colors["muted-foreground"]} />
        </Animated.View>
      </Tappable>
      {open ? (
        <Animated.View entering={FadeIn.duration(200).reduceMotion(ReduceMotion.System)}>
          <Text style={styles.answer}>{answer}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing(2) },
  item: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  question: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    minHeight: theme.touchTarget,
    padding: spacing(4),
    backgroundColor: colors.surface,
  },
  questionText: { flex: 1, fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  answer: {
    paddingHorizontal: spacing(4),
    paddingBottom: spacing(4),
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors["muted-foreground"],
  },
  lead: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.label },
  email: { fontFamily: font.semibold, fontSize: 15, color: colors["primary-strong"] },
  faqTitle: {
    marginTop: spacing(2),
    marginBottom: -spacing(1),
    fontFamily: font.display,
    fontSize: 18,
    letterSpacing: -0.36,
    color: colors.foreground,
  },
});
