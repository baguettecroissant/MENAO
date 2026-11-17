import { CLIENT_FAQ, CLIENT_FAQ_THEMES, type ClientFaqTheme } from "@menao/core";
import { router } from "expo-router";
import { ArrowRight, ChevronRight, Mail, Sparkles } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Question } from "@/components/faq-question";
import { PageHead } from "@/components/pro/dossier-kit";
import { FicheScreen } from "@/components/pro/fiche-kit";
import { fr } from "@/i18n/fr";
import { haptic } from "@/lib/haptics";
import { Tappable } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.clientHelp;
const { colors, font, spacing } = theme;

/**
 * « Aide » du particulier (lot 67, ADR 0361, maquette « AideClientApp ») : l'assistant, « Écrire
 * à l'équipe MENAO », puis les questions fréquentes du site par thème. Tout reste dans
 * l'application : plus de renvoi vers le site pour les questions et le contact.
 */
export function ClientHelp() {
  const [theme_, setTheme] = useState<ClientFaqTheme>("project");
  return (
    <FicheScreen>
      <PageHead title={t.title} />
      <Tappable
        role="link"
        aria-label={`${t.assistant.title}. ${t.assistant.lead}`}
        onPress={() => router.push("/assistant")}
        style={styles.card}
      >
        <View style={styles.cardHead}>
          <View style={[styles.icon, styles.iconDark]}>
            <Sparkles size={22} color={colors["primary-foreground"]} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>{t.assistant.title}</Text>
            <Text style={styles.cardLead}>{t.assistant.lead}</Text>
          </View>
        </View>
        <View style={styles.fakeInput}>
          <Text style={styles.fakeInputText}>{t.assistant.example}</Text>
          <View style={styles.go}>
            <ArrowRight size={17} strokeWidth={2.4} color={colors["primary-foreground"]} />
          </View>
        </View>
      </Tappable>
      <Tappable
        role="link"
        aria-label={`${t.contact.title}. ${t.contact.lead}`}
        onPress={() => router.push("/contact")}
        style={styles.card}
      >
        <View style={styles.cardHead}>
          <View style={[styles.icon, styles.iconSoft]}>
            <Mail size={21} color={colors["primary-strong"]} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>{t.contact.title}</Text>
            <Text style={styles.cardLead}>{t.contact.lead}</Text>
          </View>
          <ChevronRight size={20} color={colors["muted-foreground"]} />
        </View>
      </Tappable>

      <Text role="heading" style={styles.faqTitle}>
        {t.faqTitle}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        role="tablist"
        aria-label={t.themesLabel}
        style={styles.themes}
        contentContainerStyle={styles.themesContent}
      >
        {CLIENT_FAQ_THEMES.map((key) => {
          const on = key === theme_;
          return (
            <Pressable
              key={key}
              role="tab"
              aria-selected={on}
              onPress={() => {
                haptic.select();
                setTheme(key);
              }}
              style={[styles.theme, on && styles.themeOn]}
            >
              <Text style={[styles.themeText, on && styles.themeTextOn]}>
                {CLIENT_FAQ[key].title}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.list}>
        {CLIENT_FAQ[theme_].items.map((item) => (
          <Question key={item.q} question={item.q} answer={item.a} />
        ))}
      </View>
    </FicheScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing(2.5),
    padding: spacing(4),
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: spacing(3) },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  iconDark: { backgroundColor: colors.foreground },
  iconSoft: { backgroundColor: colors["primary-soft"] },
  cardText: { flex: 1, gap: 1 },
  cardTitle: { fontFamily: font.bold, fontSize: 16, color: colors.foreground },
  cardLead: { fontFamily: font.regular, fontSize: 13.5, color: colors["muted-foreground"] },
  fakeInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2.5),
    height: 48,
    paddingLeft: spacing(3.5),
    paddingRight: 7,
    borderRadius: 24,
    backgroundColor: colors.background,
  },
  fakeInputText: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 15,
    color: colors["muted-foreground"],
  },
  go: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  faqTitle: {
    marginTop: spacing(1),
    fontFamily: font.display,
    fontSize: 20,
    letterSpacing: -0.4,
    color: colors.foreground,
  },
  themes: { marginHorizontal: -spacing(4), flexGrow: 0 },
  themesContent: { paddingHorizontal: spacing(4), gap: spacing(2) },
  theme: {
    height: 36,
    paddingHorizontal: spacing(3.5),
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors["border-strong"],
    backgroundColor: colors.surface,
    justifyContent: "center",
  },
  themeOn: { borderColor: colors.foreground, backgroundColor: colors.foreground },
  themeText: { fontFamily: font.semibold, fontSize: 13.5, color: colors.foreground },
  themeTextOn: { color: colors["primary-foreground"] },
  list: { gap: spacing(2) },
});
