import { displayPoints, type StandOutItem, type StandOutKey } from "@menao/core";
import { router, type Href } from "expo-router";
import {
  Camera,
  Check,
  GraduationCap,
  ImageIcon,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  type LucideIcon,
} from "lucide-react-native";
import { Image, StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import type { StandOutView } from "@/lib/stand-out-view";
import { Tappable } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proDossier.standOut;
const { colors, font, spacing, radius } = theme;

const ICONS: Record<StandOutKey, LucideIcon> = {
  image: ImageIcon,
  savoir_faire: GraduationCap,
  certifications: ShieldCheck,
  realisations: Camera,
};

const LINKS: Record<StandOutKey, Href> = {
  image: "/pro-profil-public",
  savoir_faire: "/pro-metiers",
  certifications: "/pro-metiers",
  realisations: "/pro-profil-public",
};

/**
 * « Pour vous démarquer » (lot 81, ADR 0391), comme sur le site : quatre atouts avec les points
 * du Score MENAO, la jauge, l'aperçu de la fiche et le budget minimum en ligne de réglage.
 */
export function StandOutCard({ view }: { view: StandOutView }) {
  const { summary, preview } = view;
  const remaining = displayPoints(summary.remaining);
  const share = summary.max > 0 ? Math.round((summary.earned / summary.max) * 100) : 0;
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.titleRow}>
          <Sparkles size={20} color={colors.primary} />
          <Text role="heading" style={styles.title}>
            {t.title}
          </Text>
        </View>
        <Text style={styles.lead}>{t.lead}</Text>
        <Text style={styles.count}>{t.count(summary.doneCount, summary.items.length)}</Text>
      </View>

      <View style={styles.gauge}>
        <Text style={styles.gaugeLabel}>{t.score}</Text>
        <Text style={styles.gaugeLabel}>
          {remaining > 0 ? (
            <>
              {t.toWinBefore} <Text style={styles.gaugeStrong}>{t.points(remaining)}</Text>{" "}
              {t.toWinAfter}
            </>
          ) : (
            t.allWon
          )}
        </Text>
        <View style={styles.bar}>
          {share > 0 ? <View style={[styles.barDone, { flexGrow: share }]} /> : null}
          {share < 100 ? <View style={[styles.barLeft, { flexGrow: 100 - share }]} /> : null}
        </View>
        <Text style={styles.gaugeHint}>{t.scoreHint}</Text>
      </View>

      <View style={styles.preview}>
        <Text style={styles.previewLabel}>{t.preview.toUpperCase()}</Text>
        <View style={styles.fiche}>
          <View style={styles.ficheHead}>
            {preview.imageUrl ? (
              <Image source={{ uri: preview.imageUrl }} style={styles.ficheImage} />
            ) : (
              <View style={[styles.ficheImage, styles.dashed]} aria-label={t.previewImage}>
                <ImageIcon size={20} color={colors["muted-foreground"]} />
              </View>
            )}
            <View style={styles.ficheNames}>
              <Text style={styles.ficheName} numberOfLines={1}>
                {preview.name}
              </Text>
              <Text style={styles.ficheSub} numberOfLines={1}>
                {preview.subtitle}
              </Text>
            </View>
          </View>
          <View style={styles.badges}>
            <Badge label={preview.diplomaLabel} slot={t.slots.diploma} />
            <Badge label={preview.certificationLabel} slot={t.slots.certification} />
            <Badge
              label={preview.specialitesCount > 0 ? t.specialites(preview.specialitesCount) : null}
              slot={t.slots.specialites}
            />
          </View>
          <View style={styles.photos}>
            {[0, 1, 2].map((i) =>
              preview.photoUrls[i] ? (
                <Image
                  key={i}
                  source={{ uri: preview.photoUrls[i] }}
                  accessibilityLabel={t.previewPhoto(i + 1)}
                  style={styles.photo}
                />
              ) : (
                <View key={i} style={[styles.photo, styles.dashed]}>
                  <Text style={styles.slotText}>{t.slots.photo}</Text>
                </View>
              ),
            )}
          </View>
          {preview.presentation ? (
            <Text style={styles.presentation} numberOfLines={2}>
              {preview.presentation}
            </Text>
          ) : null}
        </View>
        <Text style={styles.previewHint}>{t.previewHint}</Text>
      </View>

      {summary.items.map((item) => (
        <Tile
          key={item.key}
          item={item}
          doneLabel={
            item.key === "realisations"
              ? t.photosDone(view.photoCount)
              : item.key === "certifications"
                ? t.certsDone(view.certificationCount)
                : t.items[item.key].done
          }
        />
      ))}

      <Tappable
        role="link"
        aria-label={`${t.budgetTitle}, ${t.modify}`}
        onPress={() => router.push("/pro-metiers")}
        style={styles.budget}
      >
        <SlidersHorizontal size={17} color={colors["muted-foreground"]} />
        <View style={styles.budgetText}>
          <Text style={styles.budgetTitle}>{t.budgetTitle}</Text>
          <Text style={styles.budgetHint}>
            {view.budgetLabel ? t.budgetSet(view.budgetLabel) : t.budgetAll}
          </Text>
        </View>
        <Text style={styles.modify}>{t.modify}</Text>
      </Tappable>
    </View>
  );
}

function Badge({ label, slot }: { label: string | null; slot: string }) {
  return label ? (
    <Text style={[styles.badge, styles.badgeFilled]}>{label}</Text>
  ) : (
    <Text style={[styles.badge, styles.badgeSlot]}>{slot}</Text>
  );
}

function Tile({ item, doneLabel }: { item: StandOutItem; doneLabel: string }) {
  const Icon = ICONS[item.key];
  const texts = t.items[item.key];
  const gain = displayPoints(item.gain);
  return (
    <View style={[styles.tile, item.done && styles.tileDone]}>
      <View style={styles.tileTop}>
        <View style={[styles.tileIcon, item.done && styles.tileIconDone]}>
          <Icon size={19} color={item.done ? colors.success : colors.surface} />
        </View>
        {item.done ? (
          <Text style={[styles.pill, styles.pillDone]}>{t.gained(displayPoints(item.earned))}</Text>
        ) : gain > 0 ? (
          <Text style={styles.pill}>
            {item.key === "savoir_faire" ? t.upTo(gain) : t.points(gain)}
          </Text>
        ) : null}
      </View>
      <Text style={styles.tileTitle}>{texts.title}</Text>
      <Text style={styles.tileText}>{texts.text}</Text>
      <View style={styles.tileFoot}>
        {item.done ? (
          <>
            <View style={styles.doneLabel}>
              <Check size={14} strokeWidth={3} color={colors.success} />
              <Text style={styles.doneText}>{doneLabel}</Text>
            </View>
            <Tappable
              role="link"
              aria-label={`${t.modify} : ${texts.title}`}
              onPress={() => router.push(LINKS[item.key])}
            >
              <Text style={styles.modify}>{t.modify}</Text>
            </Tappable>
          </>
        ) : (
          <Tappable
            role="link"
            aria-label={`${texts.action} : ${texts.title}`}
            onPress={() => router.push(LINKS[item.key])}
            style={styles.action}
          >
            <Plus size={16} color={colors.foreground} />
            <Text style={styles.actionText}>{texts.action}</Text>
          </Tappable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing(4),
    paddingVertical: spacing(4.5),
    paddingHorizontal: spacing(4),
    borderRadius: radius.card + 4,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  head: { gap: spacing(1.5) },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  title: {
    flexShrink: 1,
    fontFamily: font.display,
    fontSize: 24,
    letterSpacing: -0.5,
    color: colors.foreground,
  },
  lead: { fontFamily: font.regular, fontSize: 14.5, lineHeight: 21, color: colors.label },
  count: {
    alignSelf: "flex-start",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors["primary-soft"],
    fontFamily: font.bold,
    fontSize: 12.5,
    color: colors["primary-strong"],
  },
  gauge: {
    gap: spacing(2),
    paddingVertical: 14,
    paddingHorizontal: spacing(4),
    borderRadius: 14,
    backgroundColor: colors.foreground,
  },
  gaugeLabel: { fontFamily: font.semibold, fontSize: 13, color: "rgba(255,255,255,0.75)" },
  gaugeStrong: { fontFamily: font.bold, color: colors.surface },
  gaugeHint: {
    fontFamily: font.regular,
    fontSize: 12.5,
    lineHeight: 18,
    color: "rgba(255,255,255,0.75)",
  },
  bar: { flexDirection: "row", gap: 4, height: 10 },
  barDone: { borderRadius: 5, backgroundColor: colors["success-soft"] },
  barLeft: {
    borderRadius: 5,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.45)",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  preview: {
    gap: spacing(3),
    padding: spacing(4),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  previewLabel: {
    fontFamily: font.bold,
    fontSize: 11,
    letterSpacing: 0.66,
    color: colors["muted-foreground"],
  },
  fiche: {
    gap: spacing(2.5),
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  ficheHead: { flexDirection: "row", alignItems: "center", gap: spacing(3) },
  ficheImage: { width: 52, height: 52, borderRadius: 14 },
  ficheNames: { flex: 1, minWidth: 0, gap: 2 },
  ficheName: { fontFamily: font.semibold, fontSize: 15, color: colors.foreground },
  ficheSub: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  dashed: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors["border-strong"],
  },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  badge: {
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontFamily: font.semibold,
    fontSize: 12,
  },
  badgeFilled: { backgroundColor: colors["primary-soft"], color: colors["primary-strong"] },
  badgeSlot: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors["border-strong"],
    color: colors["muted-foreground"],
  },
  photos: { flexDirection: "row", gap: 6 },
  photo: { flex: 1, height: 64, borderRadius: 10 },
  slotText: { fontFamily: font.regular, fontSize: 11.5, color: colors["muted-foreground"] },
  presentation: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: colors.label },
  previewHint: {
    fontFamily: font.regular,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
  tile: {
    gap: spacing(2.5),
    padding: spacing(4),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tileDone: { backgroundColor: colors.background },
  tileTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing(2.5),
  },
  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.foreground,
  },
  tileIconDone: { backgroundColor: colors["success-soft"] },
  pill: {
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors["primary-soft"],
    fontFamily: font.bold,
    fontSize: 12.5,
    color: colors["primary-strong"],
  },
  pillDone: { backgroundColor: colors["success-soft"], color: colors.success },
  tileTitle: {
    fontFamily: font.display,
    fontSize: 17,
    lineHeight: 21,
    letterSpacing: -0.2,
    color: colors.foreground,
  },
  tileText: { fontFamily: font.regular, fontSize: 13.5, lineHeight: 20, color: colors.label },
  tileFoot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing(2.5),
    paddingTop: spacing(1),
  },
  doneLabel: { flexDirection: "row", alignItems: "center", gap: 5 },
  doneText: { fontFamily: font.semibold, fontSize: 13, color: colors.success },
  modify: { fontFamily: font.semibold, fontSize: 13.5, color: colors["muted-foreground"] },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors["border-strong"],
    backgroundColor: colors.surface,
  },
  actionText: { fontFamily: font.semibold, fontSize: 14, color: colors.foreground },
  budget: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    paddingVertical: spacing(3),
    paddingHorizontal: 14,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
  },
  budgetText: { flex: 1, minWidth: 0, gap: 1 },
  budgetTitle: { fontFamily: font.semibold, fontSize: 14, color: colors.foreground },
  budgetHint: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
});
