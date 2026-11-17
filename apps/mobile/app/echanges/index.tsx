import { router } from "expo-router";
import { ChevronRight, Mail } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { PageHead } from "@/components/pro/dossier-kit";
import { FicheButton, FicheScreen, FicheSkeleton, FicheTag } from "@/components/pro/fiche-kit";
import { fr } from "@/i18n/fr";
import { formatDay } from "@/lib/format";
import { loadExchanges, type Exchange } from "@/lib/support";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice, Tappable } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.clientHelp.exchanges;
const { colors, font, spacing } = theme;
const TONES = { ouvert: "primary", en_cours: "success", resolu: "neutral" } as const;

/**
 * « Mes échanges avec MENAO » dans l'application (lot 67, ADR 0361), comme sur le site : les
 * messages écrits à l'équipe et l'état de chacun ; un toucher ouvre l'échange et ses réponses.
 */
export default function Exchanges() {
  const [exchanges, reload] = useFocusData(loadExchanges);
  if (exchanges === undefined) return <FicheSkeleton />;
  return (
    <FicheScreen
      onRefresh={reload}
      footer={
        <FicheButton label={t.write} icon={Mail} tall onPress={() => router.push("/contact")} />
      }
    >
      <PageHead title={t.title} />
      {exchanges === null ? (
        <Notice tone="error">{fr.errors.generic}</Notice>
      ) : exchanges.length === 0 ? (
        <Text style={styles.empty}>{t.empty}</Text>
      ) : (
        <View style={styles.list}>
          {exchanges.map((exchange) => (
            <Row key={exchange.id} exchange={exchange} />
          ))}
        </View>
      )}
    </FicheScreen>
  );
}

function Row({ exchange }: { exchange: Exchange }) {
  return (
    <Tappable
      role="link"
      aria-label={`${exchange.subject ?? t.untitled}, ${t.statuses[exchange.status]}`}
      onPress={() => router.push({ pathname: "/echanges/[id]", params: { id: exchange.id } })}
      style={styles.row}
    >
      <View style={styles.rowText}>
        <Text style={styles.subject} numberOfLines={1}>
          {exchange.subject ?? t.untitled}
        </Text>
        <Text style={styles.preview} numberOfLines={2}>
          {exchange.message}
        </Text>
        <View style={styles.meta}>
          <FicheTag text={t.statuses[exchange.status]} tone={TONES[exchange.status]} />
          <Text style={styles.date}>{t.sentOn(formatDay(exchange.createdAt))}</Text>
        </View>
      </View>
      <ChevronRight size={20} color={colors["muted-foreground"]} />
    </Tappable>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing(2) },
  empty: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.label },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    padding: spacing(4),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowText: { flex: 1, gap: spacing(1.5) },
  subject: { fontFamily: font.bold, fontSize: 15.5, color: colors.foreground },
  preview: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.label },
  meta: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing(2) },
  date: { fontFamily: font.regular, fontSize: 12.5, color: colors["muted-foreground"] },
});
