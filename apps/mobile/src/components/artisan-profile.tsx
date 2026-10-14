import { availability, parisToday, responseTimeBucket, reviewStars } from "@menao/core";
import { BadgeCheck, Clock, MapPin, ShieldCheck, Star, Wrench } from "lucide-react-native";
import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { PhotoViewer } from "@/components/photo-viewer";
import { ScoreBreakdown } from "@/components/score-breakdown";
import { fr } from "@/i18n/fr";
import { formatLongDate } from "@/lib/dates";
import type { ArtisanPage, PublicReview } from "@/lib/requests";
import { Body, Card } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.profile;
const { colors, font, radius, spacing } = theme;
const dayFromTimestamp = (iso: string) => formatLongDate(iso.slice(0, 10));

/**
 * Fiche publique d'un artisan (F-10), comme sur le site : identité, expérience et zone,
 * expertises, garanties, score MENAO, réalisations et derniers avis. Jamais de téléphone ni
 * d'e-mail avant l'acceptation de la demande.
 */
export function ArtisanProfileView({ page }: { page: ArtisanPage }) {
  const { profile } = page;
  const avail = availability(
    { paused: profile.paused, availableFrom: profile.available_from },
    parisToday(),
  );
  const response =
    profile.response_minutes !== null ? responseTimeBucket(profile.response_minutes) : null;
  const zone =
    profile.zone.mode === "rayon" && profile.zone.radius_km
      ? fr.results.zoneRadius(profile.zone.radius_km, profile.zone.city)
      : fr.results.zoneCommunes(profile.zone.communes);

  return (
    <>
      <Card>
        <View style={styles.head}>
          {page.avatarUrl ? (
            <Image source={{ uri: page.avatarUrl }} style={styles.avatar} alt="" />
          ) : (
            <View style={[styles.avatar, styles.initial]}>
              <Text style={styles.initialText}>{profile.display_name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.identity}>
            <View style={styles.nameRow}>
              <Text role="heading" style={styles.name}>
                {profile.display_name}
              </Text>
              <BadgeCheck size={18} color={colors.primary} />
            </View>
            {profile.company_name ? <Text style={styles.meta}>{profile.company_name}</Text> : null}
            <Text style={styles.meta}>
              {profile.trades.map((trade) => trade.label).join(" · ")}
            </Text>
          </View>
        </View>
        <View style={[styles.badge, avail.kind === "immediate" ? styles.badgeNow : null]}>
          <Text style={[styles.badgeText, avail.kind === "immediate" ? styles.badgeTextNow : null]}>
            {avail.kind === "paused"
              ? t.unavailable
              : avail.kind === "from"
                ? fr.results.availableFrom(formatLongDate(avail.date))
                : fr.results.availableNow}
          </Text>
        </View>
        <View style={styles.facts}>
          {profile.experience_years !== null && (
            <Fact
              icon={Wrench}
              label={t.experience}
              value={t.experienceValue(profile.experience_years)}
            />
          )}
          <Fact icon={MapPin} label={t.zone} value={zone} />
          {response && <Fact icon={Clock} label={t.responseTime[response]} />}
        </View>
      </Card>

      {profile.presentation ? (
        <Card>
          <Text style={styles.heading}>{t.about(profile.display_name)}</Text>
          <Body>{profile.presentation}</Body>
        </Card>
      ) : null}

      {profile.work_types.length > 0 && (
        <Card>
          <Text style={styles.heading}>{t.expertise}</Text>
          <View style={styles.tags}>
            {profile.work_types.map((work) => (
              <View key={work.code} style={styles.tag}>
                <Text style={styles.tagText}>{work.label}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {(profile.decennale?.valid_until || profile.certifications.length > 0) && (
        <Card>
          <Text style={styles.heading}>{t.guarantees}</Text>
          {profile.decennale?.valid_until && (
            <Guarantee
              title={t.decennaleTitle}
              detail={t.decennaleUntil(
                formatLongDate(profile.decennale.valid_until),
                profile.decennale.insurer,
              )}
            />
          )}
          {profile.certifications.map((c) => (
            <Guarantee
              key={`${c.type}-${c.numero}`}
              title={t.certificationTitle(c.type)}
              detail={t.certificationDetail(c.numero, formatLongDate(c.valid_until))}
            />
          ))}
        </Card>
      )}

      <Card>
        <Text style={styles.heading}>{t.score}</Text>
        {profile.score ? (
          <ScoreBreakdown score={profile.score} />
        ) : (
          <Body muted>{t.scoreEmpty}</Body>
        )}
      </Card>

      {page.photoUrls.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.heading}>{t.recent}</Text>
          <RecentPhotos urls={page.photoUrls} />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.heading}>{t.reviews}</Text>
        {page.reviews.length ? (
          page.reviews
            .slice(0, 5)
            .map((review) => (
              <ReviewItem key={review.id} review={review} artisanName={profile.display_name} />
            ))
        ) : (
          <Body muted>{t.reviewsEmpty}</Body>
        )}
      </View>
    </>
  );
}

/** Chantiers récents (F-10) : vignettes ouvertes en grand d'un appui, comme la galerie du site. */
function RecentPhotos({ urls }: { urls: string[] }) {
  const [viewing, setViewing] = useState<number | null>(null);
  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.photos}
      >
        {urls.map((uri, i) => (
          <Pressable
            key={uri}
            role="button"
            aria-label={fr.photoViewer.open(i + 1, urls.length)}
            onPress={() => setViewing(i)}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Image source={{ uri }} style={styles.photo} alt="" />
          </Pressable>
        ))}
      </ScrollView>
      <PhotoViewer photos={urls} index={viewing} onClose={() => setViewing(null)} />
    </>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wrench;
  label: string;
  value?: string;
}) {
  return (
    <View style={styles.fact}>
      <Icon size={16} color={colors.primary} />
      <Text style={styles.factText}>
        {value ? <Text style={styles.factLabel}>{label} : </Text> : null}
        {value ?? label}
      </Text>
    </View>
  );
}

function Guarantee({ title, detail }: { title: string; detail: string }) {
  return (
    <View style={styles.fact}>
      <ShieldCheck size={18} color={colors.success} />
      <View style={styles.guaranteeText}>
        <Text style={styles.factLabel}>{title}</Text>
        <Text style={styles.meta}>{detail}</Text>
      </View>
    </View>
  );
}

function ReviewItem({ review, artisanName }: { review: PublicReview; artisanName: string }) {
  const stars = reviewStars(review.score);
  return (
    <Card>
      <View style={styles.reviewHead}>
        <Text style={styles.factLabel}>{review.author}</Text>
        <View role="img" aria-label={t.stars(review.score, stars)} style={styles.stars}>
          {Array.from({ length: 5 }, (_, i) => (
            <Star
              key={i}
              size={14}
              color={i < stars ? colors.primary : colors["border-strong"]}
              fill={i < stars ? colors.primary : "transparent"}
            />
          ))}
        </View>
      </View>
      <Text style={styles.meta}>
        {review.experienceOn
          ? t.receivedOn(formatLongDate(review.experienceOn))
          : dayFromTimestamp(review.createdAt)}
      </Text>
      <Body>{review.comment}</Body>
      {review.reply ? (
        <View style={styles.reply}>
          <Text style={styles.factLabel}>{t.replyFrom(artisanName)}</Text>
          <Body muted>{review.reply}</Body>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: spacing(4) },
  avatar: { width: 72, height: 72, borderRadius: 36 },
  initial: {
    backgroundColor: colors["primary-soft"],
    alignItems: "center",
    justifyContent: "center",
  },
  initialText: { fontFamily: font.medium, fontSize: 28, color: colors["primary-strong"] },
  identity: { flex: 1, gap: spacing(1) },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  name: { flexShrink: 1, fontFamily: font.medium, fontSize: 22, color: colors.foreground },
  meta: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
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
  facts: { gap: spacing(2) },
  fact: { flexDirection: "row", alignItems: "flex-start", gap: spacing(2.5) },
  factText: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.foreground,
  },
  factLabel: { fontFamily: font.medium, fontSize: 14, color: colors.foreground },
  heading: { fontFamily: font.medium, fontSize: 17, color: colors.foreground },
  section: { gap: spacing(3) },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing(1.5) },
  tag: {
    borderRadius: radius.chip,
    backgroundColor: colors.background,
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1.5),
  },
  tagText: { fontFamily: font.regular, fontSize: 13, color: colors.foreground },
  guaranteeText: { flex: 1, gap: spacing(0.5) },
  photos: { gap: spacing(3) },
  photo: {
    width: 160,
    height: 120,
    borderRadius: radius.input,
    backgroundColor: colors["primary-soft"],
  },
  pressed: { opacity: 0.85 },
  reviewHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing(3),
  },
  stars: { flexDirection: "row", gap: 2 },
  reply: {
    gap: spacing(1),
    borderLeftWidth: 3,
    borderLeftColor: colors["primary-soft"],
    paddingLeft: spacing(3),
  },
});
