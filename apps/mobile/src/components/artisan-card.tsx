import { availability, parisToday, specialtiesPreview } from "@menao/core";
import { BadgeCheck, BriefcaseBusiness, Check, MapPin, ShieldCheck } from "lucide-react-native";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { fr } from "@/i18n/fr";
import { formatLongDate } from "@/lib/dates";
import type { MatchedArtisan } from "@/lib/project";
import { Button } from "@/ui";
import { theme } from "@/ui/theme";
import { ArtisanPlaceholder } from "@/components/artisan-placeholder";

const t = fr.results;
const { colors, font, radius, spacing } = theme;

/** Largeur d'une carte du carrousel : la suivante dépasse, pour inviter à faire défiler. */
export const TILE_WIDTH = 236;

/** Spécialités affichées sur une carte, comme la maquette (les autres en « +N »). */
const SHOWN_SPECIALTIES = 2;

function zoneLabel(zone: MatchedArtisan["zone"]): string {
  return zone.mode === "rayon" && zone.radiusKm
    ? t.zoneRadius(zone.radiusKm, zone.city)
    : t.zoneCommunes(zone.communes);
}

/** Sélection pour la demande (3 artisans au plus, F-11). */
export type CardSelection = "selectable" | "selected" | "sent" | "none";

/**
 * Carte d'un artisan proposé (F-09), dans le carrousel de la maquette « Résultat de recherche - in
 * app » : photo, métier et expérience, zone et distance, disponibilité, puis les spécialités
 * demandées par le projet en premier. Un appui ouvre la fiche ; la coche, en haut à droite de la
 * photo, ajoute l'artisan à la demande.
 */
export function ArtisanTile({
  artisan,
  tradeLabel,
  projectWorkTypes,
  onOpen,
  selection = "none",
  onToggle,
  otherTrade = false,
  recommendedBy,
}: {
  artisan: MatchedArtisan;
  tradeLabel: string;
  projectWorkTypes: string[];
  onOpen: () => void;
  selection?: CardSelection;
  onToggle?: () => void;
  /** Artisan d'un autre métier du chantier (ADR 0170) : le métier est lu avec son nom. */
  otherTrade?: boolean;
  /** Partenaire recommandé par un artisan du chantier (ADR 0174) : son nom, null s'il est inconnu. */
  recommendedBy?: string | null;
}) {
  const avail = availability({ paused: false, availableFrom: artisan.availableFrom }, parisToday());
  const specs = specialtiesPreview(artisan.specialties, projectWorkTypes);
  const shown = specs.shown.slice(0, SHOWN_SPECIALTIES);
  const more = specs.more + specs.shown.length - shown.length;
  const distance =
    artisan.distanceKm !== null
      ? t.distance(artisan.distanceKm.toLocaleString("fr-FR", { maximumFractionDigits: 1 }))
      : null;
  const selected = selection === "selected";
  return (
    <View style={[styles.tile, selected && styles.tileSelected]}>
      <Pressable
        role="link"
        aria-label={`${fr.selection.viewProfile} : ${artisan.name}`}
        onPress={onOpen}
        style={({ pressed }) => pressed && styles.pressed}
      >
        {artisan.avatarUrl ? (
          <Image source={{ uri: artisan.avatarUrl }} style={styles.photo} alt="" />
        ) : (
          <ArtisanPlaceholder name={artisan.name} style={styles.photo} medallion={72} />
        )}
        <View style={styles.body}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {artisan.name}
            </Text>
            <BadgeCheck size={16} color={colors.primary} />
          </View>
          <View style={styles.row}>
            <BriefcaseBusiness size={13} color={colors["muted-foreground"]} />
            <Text style={styles.meta} numberOfLines={1}>
              {t.since(tradeLabel, artisan.experienceYears)}
            </Text>
          </View>
          <View style={styles.row}>
            <MapPin size={13} color={colors["muted-foreground"]} />
            <Text style={styles.meta} numberOfLines={1}>
              {zoneLabel(artisan.zone)}
              {distance ? ` · ${distance}` : ""}
            </Text>
          </View>
          {recommendedBy !== undefined ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {t.recommended.by(recommendedBy ?? t.recommended.someone)}
              </Text>
            </View>
          ) : null}
          {artisan.outsideZone ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{t.wider.badge}</Text>
            </View>
          ) : null}
          {artisan.score !== null ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{t.score(artisan.score)}</Text>
            </View>
          ) : null}
          {artisan.verified ? (
            <View style={styles.badge}>
              <ShieldCheck size={13} color={colors["primary-strong"]} />
              <Text style={styles.badgeText}>{t.verified}</Text>
            </View>
          ) : null}
          <View style={[styles.badge, avail.kind === "immediate" && styles.badgeNow]}>
            {avail.kind === "immediate" ? <View style={styles.dot} /> : null}
            <Text style={[styles.badgeText, avail.kind === "immediate" && styles.badgeTextNow]}>
              {avail.kind === "from" ? t.availableFrom(formatLongDate(avail.date)) : t.availableNow}
            </Text>
          </View>
          {shown.length > 0 ? (
            <View style={styles.specialties}>
              {shown.map((label) => (
                <View key={label} style={styles.specialty}>
                  <Text style={styles.specialtyText} numberOfLines={1}>
                    {label}
                  </Text>
                </View>
              ))}
              {more > 0 ? (
                <View style={styles.specialty}>
                  <Text style={styles.specialtyText}>{t.more(more)}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </Pressable>
      {selection === "sent" ? (
        <View style={styles.sent}>
          <Check size={13} color={colors.success} strokeWidth={2.6} />
          <Text style={styles.sentText}>{fr.selection.alreadySent}</Text>
        </View>
      ) : selection !== "none" ? (
        <Pressable
          role="checkbox"
          aria-checked={selected}
          aria-label={`${fr.selection.select} ${artisan.name}${otherTrade ? `, ${tradeLabel}` : ""}`}
          onPress={onToggle}
          hitSlop={8}
          style={({ pressed }) => [
            styles.check,
            selected && styles.checkOn,
            pressed && styles.pressed,
          ]}
        >
          <Check
            size={18}
            color={selected ? colors["primary-foreground"] : colors["primary-strong"]}
            strokeWidth={2.6}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Dernière carte du carrousel (maquette) : « Vous ne trouvez pas votre artisan idéal ? », vers
 * l'envoi du dossier à l'équipe MENAO, comme sur le site.
 */
export function HelpTile({ onPress }: { onPress: () => void }) {
  return (
    <View style={[styles.tile, styles.help]}>
      <Text role="heading" style={styles.helpTitle}>
        {t.help.title}
      </Text>
      <Text style={styles.helpText}>{t.help.text}</Text>
      <Button label={t.help.cta} onPress={onPress} />
      <View pointerEvents="none" aria-hidden style={styles.helpArc}>
        <Svg viewBox="0 0 64 40" width="100%" height="100%">
          <Path
            d="M6 36 A28 28 0 0 1 58 22"
            fill="none"
            stroke={colors["primary-soft"]}
            strokeWidth={8}
            strokeLinecap="round"
          />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: TILE_WIDTH,
    overflow: "hidden",
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    boxShadow: "0 1px 3px rgba(17, 23, 40, 0.06)",
  },
  tileSelected: { borderColor: colors.primary, borderWidth: 2 },
  pressed: { opacity: 0.85 },
  photo: { width: "100%", height: 140, backgroundColor: colors["primary-soft"] },
  body: { gap: spacing(1.5), padding: spacing(3.5) },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  name: { flexShrink: 1, fontFamily: font.medium, fontSize: 17, color: colors.foreground },
  row: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  meta: {
    flexShrink: 1,
    fontFamily: font.regular,
    fontSize: 12,
    color: colors["muted-foreground"],
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing(1.5),
    borderRadius: radius.pill,
    backgroundColor: colors["primary-softer"],
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1),
    marginTop: spacing(0.5),
  },
  badgeNow: { backgroundColor: colors["success-soft"] },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  badgeText: { fontFamily: font.medium, fontSize: 12, color: colors["primary-strong"] },
  badgeTextNow: { color: colors.success },
  specialties: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing(1.5),
    marginTop: spacing(0.5),
  },
  specialty: {
    maxWidth: "100%",
    borderRadius: radius.chip,
    backgroundColor: colors.background,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
  },
  specialtyText: { fontFamily: font.regular, fontSize: 12, color: colors.foreground },
  check: {
    position: "absolute",
    top: spacing(2.5),
    right: spacing(2.5),
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: { backgroundColor: colors.primary },
  sent: {
    position: "absolute",
    top: spacing(2.5),
    right: spacing(2.5),
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1),
    borderRadius: radius.pill,
    backgroundColor: colors["success-soft"],
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1),
  },
  sentText: { fontFamily: font.medium, fontSize: 12, color: colors.success },
  help: {
    justifyContent: "center",
    gap: spacing(3),
    backgroundColor: colors["primary-softer"],
    borderColor: colors["primary-soft"],
    padding: spacing(4),
  },
  helpTitle: { fontFamily: font.medium, fontSize: 17, lineHeight: 23, color: colors.foreground },
  helpText: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors["muted-foreground"],
  },
  helpArc: { position: "absolute", right: -6, bottom: 8, width: 72, height: 44 },
});
