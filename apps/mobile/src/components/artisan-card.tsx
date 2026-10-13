import { availability, parisToday, specialtiesPreview } from "@menao/core";
import { BadgeCheck, Check, ChevronRight, MapPin } from "lucide-react-native";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
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
export type CardSelection = "selectable" | "selected" | "sent" | "none";

export function ArtisanCard({
  artisan,
  tradeLabel,
  projectWorkTypes,
  onOpen,
  selection = "none",
  onToggle,
}: {
  artisan: MatchedArtisan;
  tradeLabel: string;
  projectWorkTypes: string[];
  /** Ouvre la fiche de l'artisan. */
  onOpen?: () => void;
  /** Sélection pour la demande (3 artisans au plus, F-11). */
  selection?: CardSelection;
  onToggle?: () => void;
}) {
  const avail = availability({ paused: false, availableFrom: artisan.availableFrom }, parisToday());
  const specs = specialtiesPreview(artisan.specialties, projectWorkTypes);
  const distance =
    artisan.distanceKm !== null
      ? t.distance(artisan.distanceKm.toLocaleString("fr-FR", { maximumFractionDigits: 1 }))
      : null;
  return (
    <View style={[styles.card, selection === "selected" && styles.cardSelected]}>
      <Pressable role="button" onPress={onOpen} disabled={!onOpen} style={styles.body}>
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
              {artisan.experienceYears !== null
                ? ` · ${t.experience(artisan.experienceYears)}`
                : ""}
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
      </Pressable>
      {(onOpen || selection !== "none") && (
        <View style={styles.footer}>
          {onOpen ? (
            <Pressable role="link" onPress={onOpen} hitSlop={8} style={styles.profileLink}>
              <Text style={styles.profileLinkText}>{fr.selection.viewProfile}</Text>
              <ChevronRight size={16} color={colors["primary-strong"]} />
            </Pressable>
          ) : (
            <View />
          )}
          {selection === "sent" ? (
            <Text style={styles.sent}>{fr.selection.alreadySent}</Text>
          ) : selection !== "none" ? (
            <Pressable
              role="checkbox"
              aria-checked={selection === "selected"}
              aria-label={`${fr.selection.select} ${artisan.name}`}
              onPress={onToggle}
              style={({ pressed }) => [
                styles.select,
                selection === "selected" && styles.selectOn,
                pressed && styles.pressed,
              ]}
            >
              {selection === "selected" && <Check size={16} color={colors["primary-foreground"]} />}
              <Text style={[styles.selectText, selection === "selected" && styles.selectTextOn]}>
                {selection === "selected" ? fr.selection.selected : fr.selection.select}
              </Text>
            </Pressable>
          ) : null}
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
  cardSelected: { borderColor: colors.primary, borderWidth: 2 },
  body: { gap: spacing(3) },
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
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing(3),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing(3),
  },
  profileLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1),
    minHeight: theme.touchTarget,
  },
  profileLinkText: { fontFamily: font.medium, fontSize: 14, color: colors["primary-strong"] },
  select: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.5),
    minHeight: theme.touchTarget - 4,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingHorizontal: spacing(4),
  },
  selectOn: { backgroundColor: colors.primary },
  selectText: { fontFamily: font.medium, fontSize: 14, color: colors["primary-strong"] },
  selectTextOn: { color: colors["primary-foreground"] },
  pressed: { opacity: 0.85 },
  sent: { fontFamily: font.medium, fontSize: 14, color: colors.success },
});
