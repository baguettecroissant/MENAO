import { parisToday, warranties } from "@menao/core";
import { ShieldCheck } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { formatDay } from "@/lib/format";
import { Card } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.warranties;
const { colors, font, spacing } = theme;

/**
 * Garanties légales après la réception (Code civil, art. 1792 et suivants ; ADR 0041), comme sur
 * le site : échéances calculées depuis la date de réception, assureur décennal repris du devis.
 * TODO(legal) : formulation et exemples à faire valider (garanties applicables selon les travaux).
 */
export function WarrantyCard({
  receivedOn,
  insurer,
}: {
  /** Date de réception (AAAA-MM-JJ, heure de Paris). */
  receivedOn: string;
  insurer: { name: string; policy: string | null } | null;
}) {
  const items = warranties(receivedOn, parisToday());
  return (
    <Card>
      <View style={styles.card}>
        <Text role="heading" style={styles.title}>
          {t.title}
        </Text>
        <Text style={styles.muted}>{t.intro(formatDay(receivedOn))}</Text>
        {items.map((w) => (
          <View key={w.kind} style={styles.item}>
            <ShieldCheck
              size={16}
              color={w.active ? colors.success : colors["subtle-foreground"]}
            />
            <View style={styles.itemText}>
              <Text style={styles.text}>
                <Text style={styles.strong}>{t.kinds[w.kind].label}</Text>
                {" : "}
                {w.active ? t.until(formatDay(w.until)) : t.ended(formatDay(w.until))}
              </Text>
              <Text style={styles.small}>{t.kinds[w.kind].what}</Text>
            </View>
          </View>
        ))}
        {insurer ? (
          <Text style={styles.small}>{t.insurer(insurer.name, insurer.policy)}</Text>
        ) : null}
        <Text style={styles.small}>{t.advice}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing(3) },
  title: { fontFamily: font.medium, fontSize: 16, color: colors.foreground },
  item: { flexDirection: "row", alignItems: "flex-start", gap: spacing(3) },
  itemText: { flex: 1, gap: 2 },
  text: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.foreground },
  strong: { fontFamily: font.medium },
  muted: {
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors["muted-foreground"],
  },
  small: {
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors["muted-foreground"],
  },
});
