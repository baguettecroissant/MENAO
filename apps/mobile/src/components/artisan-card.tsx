import { availability, parisToday, specialtiesPreview } from "@menao/core";
import { BadgeCheck, Check, ShieldCheck } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { FicheButton, FicheTag } from "@/components/pro/fiche-kit";
import { ArtisanAvatar, SelectionDot } from "@/components/request-kit";
import { fr } from "@/i18n/fr";
import { formatLongDate } from "@/lib/dates";
import { haptic } from "@/lib/haptics";
import type { MatchedArtisan } from "@/lib/project";
import { theme } from "@/ui/theme";

const t = fr.results;
const { colors, font, spacing } = theme;

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
 * Carte d'un artisan proposé (F-09), d'après la maquette « ResultatsApp » (refonte « Nette »,
 * lot 12) : photo ronde, nom (Inter Tight), métier et expérience, zone et distance, pastilles
 * (disponibilité en couleur, Score MENAO, vérification), spécialités demandées par le projet en
 * premier, et rond de sélection à droite (bleu nuit avec coche, carte bordée de 2 px bleu nuit).
 * Un appui sur la carte ouvre la fiche ; le rond ajoute l'artisan à la demande.
 */
export function ArtisanPickCard({
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
  const toggleable = selection === "selectable" || selected;
  return (
    <View style={[styles.card, !toggleable && styles.cardPlain, selected && styles.cardOn]}>
      <Pressable
        role="link"
        aria-label={`${fr.selection.viewProfile} : ${artisan.name}`}
        onPress={onOpen}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
      >
        <ArtisanAvatar name={artisan.name} uri={artisan.avatarUrl} size={52} />
        <View style={styles.body}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={2}>
              {artisan.name}
            </Text>
            <BadgeCheck size={15} color={colors.primary} style={styles.badgeIcon} />
          </View>
          <Text style={styles.meta} numberOfLines={1}>
            {[t.since(tradeLabel, artisan.experienceYears), distance].filter(Boolean).join(" · ")}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {zoneLabel(artisan.zone)}
          </Text>
          <View style={styles.tags}>
            {/* Déjà sollicité : l'état prend la place du rond de sélection. */}
            {selection === "sent" ? (
              <View style={styles.sent}>
                <Check size={13} color={colors["primary-foreground"]} strokeWidth={3} />
                <Text style={styles.sentText}>{fr.selection.alreadySent}</Text>
              </View>
            ) : null}
            <FicheTag
              dot
              tone={avail.kind === "immediate" ? "success" : "warning"}
              text={
                avail.kind === "from" ? t.availableFrom(formatLongDate(avail.date)) : t.availableNow
              }
            />
            {artisan.score !== null ? (
              <FicheTag tone="primary" text={t.score(artisan.score)} />
            ) : null}
            {artisan.verified ? (
              <View style={styles.verified}>
                <ShieldCheck size={13} color={colors.success} />
                <Text style={styles.verifiedText}>{t.verified}</Text>
              </View>
            ) : null}
            {artisan.outsideZone ? <FicheTag tone="neutral" text={t.wider.badge} /> : null}
            {recommendedBy !== undefined ? (
              <FicheTag
                tone="neutral"
                text={t.recommended.by(recommendedBy ?? t.recommended.someone)}
              />
            ) : null}
          </View>
          {shown.length > 0 ? (
            <Text style={styles.specialties} numberOfLines={2}>
              {[...shown, ...(more > 0 ? [t.more(more)] : [])].join(" · ")}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {toggleable ? (
        <Pressable
          role="checkbox"
          aria-checked={selected}
          aria-label={`${fr.selection.select} ${artisan.name}${otherTrade ? `, ${tradeLabel}` : ""}`}
          onPress={() => {
            haptic.select();
            onToggle?.();
          }}
          hitSlop={6}
          style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
        >
          <SelectionDot selected={selected} />
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Dernière carte de la liste : « Vous ne trouvez pas votre artisan idéal ? », vers l'envoi du
 * dossier à l'équipe MENAO, comme sur le site.
 */
export function HelpCard({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.help}>
      <Text role="heading" style={styles.helpTitle}>
        {t.help.title}
      </Text>
      <Text style={styles.helpText}>{t.help.text}</Text>
      <FicheButton label={t.help.cta} variant="secondary" onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: spacing(2),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardPlain: { paddingRight: 14 },
  // Bordure de 2 px : la marge intérieure perd 1 px, la carte garde sa taille.
  cardOn: {
    borderWidth: 2,
    borderColor: colors.foreground,
    paddingVertical: 13,
    paddingLeft: 13,
    paddingRight: spacing(2) - 1,
  },
  pressed: { opacity: 0.8 },
  main: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "flex-start", gap: spacing(3) },
  body: { flex: 1, minWidth: 0, gap: spacing(1) },
  nameRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing(1.5) },
  name: {
    flexShrink: 1,
    fontFamily: font.display,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.3,
    color: colors.foreground,
  },
  badgeIcon: { marginTop: 2, flexShrink: 0 },
  meta: { fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: colors.label },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 },
  verified: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1),
    paddingVertical: spacing(1),
  },
  verifiedText: { fontFamily: font.semibold, fontSize: 12, color: colors.success },
  specialties: {
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors["muted-foreground"],
  },
  sent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1),
    borderRadius: theme.radius.chip,
    backgroundColor: colors.success,
    paddingHorizontal: 9,
    paddingVertical: spacing(1),
  },
  sentText: { fontFamily: font.bold, fontSize: 12, color: colors["primary-foreground"] },
  // Cible tactile de 44 px autour du rond de 28 px.
  toggle: {
    width: theme.touchTarget,
    height: theme.touchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  help: {
    gap: spacing(3),
    padding: spacing(4.5),
    borderRadius: 16,
    backgroundColor: colors["primary-soft"],
  },
  helpTitle: {
    fontFamily: font.display,
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.36,
    color: colors.foreground,
  },
  helpText: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.label },
});
