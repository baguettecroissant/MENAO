import * as Linking from "expo-linking";
import { Mail } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { ClientHelp } from "@/components/client-help";
import { Question } from "@/components/faq-question";
import { ArtisanAssistant } from "@/components/pro/artisan-assistant";
import { CardHeading, FicheButton, FicheCard, FicheScreen } from "@/components/pro/fiche-kit";
import { fr } from "@/i18n/fr";
import { useSession } from "@/lib/session";
import { toast } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.help;
const { colors, font, spacing } = theme;

/**
 * « Aide et contact » de l'artisan (ADR 0129), refonte « Nette » (lot 8, maquette « AideApp ») :
 * la carte de l'assistant de l'espace artisan (ADR 0236), la carte « Écrire à l'équipe MENAO »
 * (réponse par e-mail), puis les questions fréquentes dépliables ; sans lien vers le site
 * (CLAUDE.md règle 10).
 */
export default function Aide() {
  const { role } = useSession();
  // Particulier ou visiteur : son aide à lui (questions du site, contact, assistant ; ADR 0361).
  if (role !== "artisan" && role !== "artisan_en_attente") return <ClientHelp />;
  return <ArtisanHelp artisan={role === "artisan"} />;
}

function ArtisanHelp({ artisan }: { artisan: boolean }) {
  async function write() {
    const url = `mailto:${t.email}?subject=${encodeURIComponent(t.subject)}`;
    const ok = await Linking.canOpenURL(url).catch(() => false);
    if (!ok) return toast.info(t.noMail);
    await Linking.openURL(url);
  }

  return (
    <FicheScreen title={t.title}>
      {artisan ? <ArtisanAssistant onWrite={() => void write()} /> : null}
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

const styles = StyleSheet.create({
  list: { gap: spacing(2) },
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
