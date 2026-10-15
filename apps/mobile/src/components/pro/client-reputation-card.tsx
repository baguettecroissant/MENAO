import { CLIENT_RATING_CRITERIA } from "@menao/core";
import { UserRound } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { DetailBlock } from "@/components/pro/request-blocks";
import { fr } from "@/i18n/fr";
import type { ClientReputation } from "@/lib/client-ratings";
import { Body } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proClientRating;
const { colors, font, radius, spacing } = theme;

/**
 * « Ce client sur MENAO » (F-23, ADR 0106), comme sur le site : moyenne de chaque critère et
 * nombre de notes laissées par les artisans, sur une demande reçue, seulement si l'équipe a rendu
 * les notes visibles. Jamais les commentaires.
 */
export function ClientReputationCard({ reputation }: { reputation: ClientReputation }) {
  return (
    <DetailBlock icon={<UserRound size={18} color={colors.primary} />} title={t.reputationTitle}>
      <Body muted>{t.reputation(reputation.ratings)}</Body>
      <View style={styles.list}>
        {CLIENT_RATING_CRITERIA.map((key) => (
          <View key={key} style={styles.row}>
            <Text style={styles.label}>{t.criteria[key]}</Text>
            <Text style={styles.value}>{fr.clientReview.percent(reputation[key])}</Text>
          </View>
        ))}
      </View>
    </DetailBlock>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing(2) },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing(3),
    borderRadius: radius.input,
    backgroundColor: colors.background,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
  },
  label: { flex: 1, fontFamily: font.regular, fontSize: 14, color: colors["muted-foreground"] },
  value: { fontFamily: font.medium, fontSize: 14, color: colors.foreground },
});
