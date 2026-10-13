import { availability, parisToday, specialtiesPreview } from "@menao/core";
import { BadgeCheck, MapPin } from "lucide-react-native";
import { Image, StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { formatLongDate } from "@/lib/dates";
import type { MatchedArtisan } from "@/lib/project";
import { theme } from "@/ui/theme";

const t = fr.results;
const { colors, font, radius, spacing } = theme;

function zoneLabel(zone: MatchedArtisan["zone"]): string {
  return zone.mode === "rayon" && zone.radiusKm
    ? t.zoneRadius(zone.radiusKm, zone.city)
    : t.zoneCommunes(zone.communes);
}

/**
 * Carte d'un artisan proposé (F-09), comme sur le site : photo, métier et expérience, zone et
 * distance, disponibilité, puis les spécialités demandées par le projet en premier.
 */
export function ArtisanCard({
  artisan,
  tradeLabel,
  projectWorkTypes,
}: {
  artisan: MatchedArtisan;
  tradeLabel: string;
  projectWorkTypes: string[];
}) {
  const avail = availability({ paused: false, availableFrom: artisan.availableFrom }, parisToday());
  const specs = specialtiesPreview(artisan.specialties, projectWorkTypes);
  const distance =
    artisan.distanceKm !== null
      ? t.distance(artisan.distanceKm.toLocaleString("fr-FR", { maximumFractionDigits: 1 }))
      : null;
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        {artisan.avatarUrl ? (
          <Image source={{ uri: artisan.avatarUrl }} style={styles.avatar} alt="" />
        ) : (
          <View style={[styles.avatar, styles.initial]}>
            <Text style={styles.initialText}>{artisan.name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.identity}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {artisan.name}
            </Text>
            <BadgeCheck size={16} color={colors.primary} />
          </View>
          <Text style={styles.meta}>
            {tradeLabel}
            {artisan.experienceYears !== null ? ` · ${t.experience(artisan.experienceYears)}` : ""}
          </Text>
        </View>
      </View>
      <View style={styles.zone}>
        <MapPin size={14} color={colors["muted-foreground"]} />
        <Text style={styles.meta}>
          {zoneLabel(artisan.zone)}
          {distance ? ` · ${distance}` : ""}
        </Text>
      </View>
      <View style={[styles.badge, avail.kind === "immediate" ? styles.badgeNow : null]}>
        <Text style={[styles.badgeText, avail.kind === "immediate" ? styles.badgeTextNow : null]}>
          {avail.kind === "from" ? t.availableFrom(formatLongDate(avail.date)) : t.availableNow}
        </Text>
      </View>
      {specs.shown.length > 0 && (
        <View style={styles.specialties}>
          {specs.shown.map((label) => (
            <View key={label} style={styles.specialty}>
              <Text style={styles.specialtyText}>{label}</Text>
            </View>
          ))}
          {specs.more > 0 && (
            <View style={styles.specialty}>
              <Text style={styles.specialtyText}>{t.more(specs.more)}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing(3),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing(4),
    boxShadow: "0 1px 3px rgba(17, 23, 40, 0.06)",
  },
  head: { flexDirection: "row", alignItems: "center", gap: spacing(3) },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  initial: {
    backgroundColor: colors["primary-soft"],
    alignItems: "center",
    justifyContent: "center",
  },
  initialText: { fontFamily: font.medium, fontSize: 20, color: colors["primary-strong"] },
  identity: { flex: 1, gap: spacing(0.5) },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  name: { flexShrink: 1, fontFamily: font.medium, fontSize: 17, color: colors.foreground },
  meta: {
    flexShrink: 1,
    fontFamily: font.regular,
    fontSize: 13,
    color: colors["muted-foreground"],
  },
  zone: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  badge: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    backgroundColor: colors["primary-softer"],
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1),
  },
  badgeNow: { backgroundColor: colors["success-soft"] },
  badgeText: { fontFamily: font.medium, fontSize: 12, color: colors["primary-strong"] },
  badgeTextNow: { color: colors.success },
  specialties: { flexDirection: "row", flexWrap: "wrap", gap: spacing(1.5) },
  specialty: {
    borderRadius: radius.chip,
    backgroundColor: colors.background,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
  },
  specialtyText: { fontFamily: font.regular, fontSize: 12, color: colors.foreground },
});
