import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Logo } from "@/components/logo";
import { PageHead } from "@/components/pro/dossier-kit";
import { FicheScreen } from "@/components/pro/fiche-kit";
import { theme } from "@/ui/theme";

const { colors, font, spacing } = theme;

/**
 * Briques des écrans de compte (refonte « Nette », lot 13), d'après les maquettes validées
 * (« InscriptionClientApp », « ConnexionMobile », « MotDePasseNette ») : logo « menao » en haut,
 * grand titre (Inter Tight) et phrase, formulaire, puis le lien vers l'autre écran sous un filet.
 */

/**
 * Écran de connexion, d'inscription ou de mot de passe : retour (sauf `back={false}`), logo, grand
 * titre, phrase facultative, puis le contenu.
 */
export function AuthScreen({
  title,
  lead,
  back = true,
  children,
}: {
  title: string;
  lead?: ReactNode;
  back?: boolean;
  children: ReactNode;
}) {
  return (
    <FicheScreen back={back}>
      <View style={styles.head}>
        <Logo />
        <PageHead title={title} />
        {typeof lead === "string" ? <Text style={styles.lead}>{lead}</Text> : lead}
      </View>
      {children}
    </FicheScreen>
  );
}

/**
 * Lien du bas, centré sous un filet : « Pas encore de compte ? Créer mon compte ». Sans filet et
 * aligné à gauche (`start`), il sert aussi de phrase sous le titre (« Vous êtes artisan ? »).
 */
export function AuthSwitch({
  question,
  label,
  onPress,
  border = true,
  start = false,
}: {
  question?: string;
  label: string;
  onPress: () => void;
  /** Filet au-dessus (absent pour « Revenir à la connexion »). */
  border?: boolean;
  /** Aligné à gauche, sous le grand titre (« Vous êtes artisan ? »). */
  start?: boolean;
}) {
  return (
    <View style={[styles.switch, border && styles.switchBorder, start && styles.switchStart]}>
      {question ? <Text style={styles.question}>{question}</Text> : null}
      <Pressable role="link" hitSlop={8} onPress={onPress}>
        <Text style={styles.link}>{label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { gap: spacing(3.5), marginBottom: spacing(1) },
  lead: { fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: colors.label },
  switch: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    columnGap: spacing(1.5),
    rowGap: spacing(1),
  },
  switchStart: { justifyContent: "flex-start" },
  switchBorder: { paddingTop: spacing(3.5), borderTopWidth: 1, borderTopColor: colors.border },
  question: { fontFamily: font.regular, fontSize: 14, color: colors.foreground },
  link: { fontFamily: font.semibold, fontSize: 14, color: colors["primary-strong"] },
});
