import type { SignatureConsent } from "@menao/core";
import * as WebBrowser from "expo-web-browser";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CheckRow } from "@/components/pro/tools-kit";
import { theme } from "@/ui/theme";

const { colors, font, radius, spacing } = theme;

export type ConsentItem = {
  name: SignatureConsent;
  label: string;
  /** Conditions à lire (prestataire, CGU, confidentialité), ouvertes dans le navigateur. */
  links: readonly { label: string; url: string }[];
};

/**
 * Cases à cocher avant une signature (F-13, F-25), toutes obligatoires : mêmes cases et mêmes
 * liens que sur le site. Refonte « Nette » (lot 11) : cases bleu nuit dans une carte blanche,
 * séparées par un trait fin.
 */
export function ConsentList({
  items,
  checked,
  onChange,
  errors,
}: {
  items: readonly ConsentItem[];
  checked: Partial<Record<SignatureConsent, boolean>>;
  onChange: (name: SignatureConsent, value: boolean) => void;
  errors: Partial<Record<SignatureConsent, string>>;
}) {
  return (
    <View style={styles.card}>
      {items.map((item, index) => (
        <View key={item.name} style={[styles.item, index > 0 && styles.separator]}>
          <CheckRow
            label={item.label}
            checked={checked[item.name] === true}
            onChange={(value) => onChange(item.name, value)}
          />
          {item.links.length > 0 ? (
            <View style={styles.links}>
              {item.links.map((link) => (
                <Pressable
                  key={link.url}
                  role="link"
                  hitSlop={8}
                  onPress={() => WebBrowser.openBrowserAsync(link.url)}
                >
                  <Text style={styles.link}>{link.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          {/* Sous les liens : l'erreur reste au plus près des conditions à accepter. */}
          {errors[item.name] ? <Text style={styles.error}>{errors[item.name]}</Text> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(1),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  item: { gap: spacing(1), paddingVertical: spacing(1) },
  separator: { borderTopWidth: 1, borderTopColor: colors.border },
  // Alignés sur le texte de la case (24 px de case et 12 px d'écart).
  links: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing(4),
    paddingLeft: 36,
    paddingBottom: spacing(2),
  },
  error: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.danger,
    paddingLeft: 36,
    paddingBottom: spacing(2),
  },
  link: {
    fontFamily: font.semibold,
    fontSize: 13,
    color: colors["primary-strong"],
    textDecorationLine: "underline",
  },
});
