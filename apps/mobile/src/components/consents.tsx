import type { SignatureConsent } from "@menao/core";
import * as WebBrowser from "expo-web-browser";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Checkbox } from "@/ui";
import { theme } from "@/ui/theme";

const { colors, font, spacing } = theme;

export type ConsentItem = {
  name: SignatureConsent;
  label: string;
  /** Conditions à lire (prestataire, CGU, confidentialité), ouvertes dans le navigateur. */
  links: readonly { label: string; url: string }[];
};

/**
 * Cases à cocher avant une signature (F-13, F-25), toutes obligatoires : mêmes cases et mêmes
 * liens que sur le site.
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
    <View style={styles.list}>
      {items.map((item) => (
        <View key={item.name} style={styles.item}>
          <Checkbox
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
  list: { gap: spacing(3) },
  item: { gap: spacing(1) },
  links: { flexDirection: "row", flexWrap: "wrap", gap: spacing(4), paddingLeft: spacing(8) },
  error: { fontFamily: font.regular, fontSize: 13, color: colors.danger, paddingLeft: spacing(8) },
  link: {
    fontFamily: font.medium,
    fontSize: 13,
    color: colors["primary-strong"],
    textDecorationLine: "underline",
  },
});
