import { isExampleId, type ChantierStatus } from "@menao/core";
import { CalendarDays, MapPin } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { StatusPill, type Tone } from "@/components/chantier/parts";
import { fr } from "@/i18n/fr";
import { prefetchChantier } from "@/lib/prefetch";
import { formatDayAndTime } from "@/lib/format";
import type { ArtisanChantierRow } from "@/lib/pro-chantiers";
import { theme } from "@/ui/theme";
import { Tappable } from "@/ui";
import { ExampleBadge } from "@/components/examples";

const t = fr.proChantiers;
const { colors, font, radius, spacing } = theme;

/** Couleur de l'état, comme sur la liste du site. */
const tone = (status: ChantierStatus): Tone =>
  status === "annule" || status === "devis_refuse"
    ? "neutral"
    : status === "rdv_planifie" || status === "devis_en_revision" || status === "acompte_paye"
      ? "primary"
      : status === "en_litige"
        ? "danger"
        : "success";

/**
 * Chantier de l'artisan dans une liste (F-18), comme sur le site : état, titre, lieu et client,
 * rendez-vous ou démarrage prévu.
 */
export function ArtisanChantierCard({
  row: r,
  onPress,
}: {
  row: ArtisanChantierRow;
  onPress: () => void;
}) {
  const status = r.status as ChantierStatus;
  const client = [r.client_first_name, r.client_last_name].filter(Boolean).join(" ");
  const place = [[r.code_postal, r.ville_nom].filter(Boolean).join(" "), client]
    .filter(Boolean)
    .join(" · ");
  const when =
    status === "rdv_planifie" && r.appointment_at
      ? formatDayAndTime(r.appointment_at)
      : status === "planifie" && r.start_at
        ? formatDayAndTime(r.start_at)
        : null;
  return (
    <Tappable
      role="link"
      aria-label={[t.status[status], r.title, place].filter(Boolean).join(", ")}
      onPressIn={() => prefetchChantier(r.chantier_id, r.title, place)}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.tags}>
        {isExampleId(r.chantier_id) ? <ExampleBadge /> : null}
        <StatusPill text={t.status[status]} tone={tone(status)} />
      </View>
      <Text style={styles.title}>{r.title}</Text>
      {place ? (
        <View style={styles.row}>
          <MapPin size={14} color={colors.primary} />
          <Text style={styles.meta}>{place}</Text>
        </View>
      ) : null}
      {when ? (
        <View style={styles.row}>
          <CalendarDays size={14} color={colors["muted-foreground"]} />
          <Text style={styles.meta}>
            {status === "rdv_planifie"
              ? t.appointmentOn(when.day, when.time)
              : t.startOn(when.day, when.time)}
          </Text>
        </View>
      ) : null}
    </Tappable>
  );
}

const styles = StyleSheet.create({
  tags: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing(2) },
  card: {
    gap: spacing(2),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing(4),
    boxShadow: "0 1px 3px rgba(17, 23, 40, 0.06)",
  },
  title: { fontFamily: font.medium, fontSize: 16, color: colors.foreground },
  row: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  meta: {
    flexShrink: 1,
    fontFamily: font.regular,
    fontSize: 13,
    color: colors["muted-foreground"],
  },
});
