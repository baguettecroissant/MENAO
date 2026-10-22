import { availability, parisToday, respondsFast, reviewStars } from "@menao/core";
import {
  BadgeCheck,
  Check,
  ChevronLeft,
  Clock,
  HeartHandshake,
  MapPin,
  ShieldCheck,
  Star,
  Wrench,
  type LucideIcon,
} from "lucide-react-native";
import { useState } from "react";
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { MenaoScore } from "@/components/menao-score";
import { PhotoViewer } from "@/components/photo-viewer";
import { ScoreBreakdown } from "@/components/score-breakdown";
import { fr } from "@/i18n/fr";
import { formatLongDate } from "@/lib/dates";
import { goBack } from "@/lib/navigation";
import type { ArtisanPage, PublicReview } from "@/lib/requests";
import { Body, Card, LinkText } from "@/ui";
import { theme } from "@/ui/theme";
import { ArtisanPlaceholder } from "@/components/artisan-placeholder";

const t = fr.profile;
const { colors, font, radius, spacing } = theme;
const dayFromTimestamp = (iso: string) => formatLongDate(iso.slice(0, 10));
/** Présentation repliée au-delà de quelques lignes (« Voir plus »), comme la maquette. */
const ABOUT_LINES = 6;

/**
 * Fiche publique d'un artisan (F-10), d'après la maquette « Fiche artisan » et comme sur le site :
 * grande photo et retour, identité et disponibilité, informations (expérience, zone, temps de
 * réponse), présentation, expertises, garanties, Score MENAO (ADR 0155), avis des clients,
 * chantiers récents et derniers avis.
 * Jamais de téléphone ni d'e-mail avant l'acceptation de la demande.
 */
export function ArtisanProfileView({ page }: { page: ArtisanPage }) {
  const { profile } = page;
  const insets = useSafeAreaInsets();
  const [aboutOpen, setAboutOpen] = useState(false);
  const avail = availability(
    { paused: profile.paused, availableFrom: profile.available_from },
    parisToday(),
  );
  const fast = respondsFast(profile.response_minutes);
  const zone =
    profile.zone.mode === "rayon" && profile.zone.radius_km
      ? fr.results.zoneRadius(profile.zone.radius_km, profile.zone.city)
      : fr.results.zoneCommunes(profile.zone.communes);
  const trade = profile.trades[0]?.label;
  const cover = page.avatarUrl ?? page.photoUrls[0] ?? null;

  return (
    <>
      <View>
        {cover ? (
          <Image source={{ uri: cover }} style={styles.cover} alt="" />
        ) : (
          <ArtisanPlaceholder name={profile.display_name} style={styles.cover} medallion={104} />
        )}
        <Pressable
          role="button"
          aria-label={fr.nav.back}
          onPress={goBack}
          hitSlop={8}
          style={({ pressed }) => [
            styles.back,
            { top: insets.top + spacing(2) },
            pressed && styles.pressed,
          ]}
        >
          <ChevronLeft size={22} color={colors.foreground} />
        </Pressable>
      </View>

      <View style={styles.identity}>
        <View style={styles.nameRow}>
          <Text role="heading" style={styles.name}>
            {trade ? `${profile.display_name} - ${trade}` : profile.display_name}
          </Text>
          <BadgeCheck size={18} color={colors.primary} />
        </View>
        {profile.company_name ? <Text style={styles.meta}>{profile.company_name}</Text> : null}
        {profile.recommended_by ? (
          <View style={styles.recommended}>
            <HeartHandshake size={14} color={colors.primary} />
            <Text style={styles.meta}>{t.recommendedBy(profile.recommended_by.name)}</Text>
          </View>
        ) : null}
        <View style={styles.badges}>
          {profile.verified ? (
            <View style={styles.badge}>
              <ShieldCheck size={14} color={colors["primary-strong"]} />
              <Text style={styles.badgeText}>{t.verifiedBadge}</Text>
            </View>
          ) : null}
          <View style={[styles.badge, avail.kind === "immediate" && styles.badgeNow]}>
            {avail.kind === "immediate" ? <View style={styles.dot} /> : null}
            <Text style={[styles.badgeText, avail.kind === "immediate" && styles.badgeTextNow]}>
              {avail.kind === "paused"
                ? t.unavailable
                : avail.kind === "from"
                  ? fr.results.availableFrom(formatLongDate(avail.date))
                  : fr.results.availableNow}
            </Text>
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.facts}
          contentContainerStyle={styles.factsContent}
        >
          {profile.experience_years !== null ? (
            <Fact
              icon={Wrench}
              label={t.experience}
              value={t.experienceValue(profile.experience_years)}
            />
          ) : null}
          <Fact icon={MapPin} label={t.zone} value={zone} />
          {fast ? <Fact icon={Clock} label={t.responseLabel} value={t.fastResponse} /> : null}
        </ScrollView>
      </View>

      <View style={styles.content}>
        {profile.presentation ? (
          <Card>
            <Text role="heading" style={styles.heading}>
              {t.about(profile.display_name)}
            </Text>
            <Text style={styles.body} numberOfLines={aboutOpen ? undefined : ABOUT_LINES}>
              {profile.presentation}
            </Text>
            {profile.presentation.length > 280 ? (
              <Pressable role="button" hitSlop={8} onPress={() => setAboutOpen((open) => !open)}>
                <Text style={styles.more}>{aboutOpen ? t.seeLess : t.seeMore}</Text>
              </Pressable>
            ) : null}
          </Card>
        ) : null}

        {profile.work_types.length > 0 ? (
          <Card>
            <Text role="heading" style={styles.heading}>
              {t.expertise}
            </Text>
            <View style={styles.tags}>
              {profile.work_types.map((work) => (
                <View key={work.code} style={styles.tag}>
                  <Text style={styles.tagText}>{work.label}</Text>
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        {profile.verified ||
        profile.decennale_exempt ||
        profile.decennale?.valid_until ||
        profile.rc_pro?.valid_until ||
        profile.diplome ||
        profile.certifications.length > 0 ||
        profile.rge.length > 0 ? (
          <Card>
            <Text role="heading" style={styles.heading}>
              {t.guarantees}
            </Text>
            {profile.verified ? (
              <Guarantee
                title={t.verifiedTitle}
                detail={t.verifiedDetail(profile.decennale_exempt)}
              />
            ) : null}
            {profile.decennale_exempt ? (
              <Guarantee title={t.decennaleExemptTitle} detail={t.decennaleExemptDetail} />
            ) : profile.decennale?.valid_until ? (
              <Guarantee
                title={t.decennaleTitle}
                detail={t.decennaleUntil(
                  formatLongDate(profile.decennale.valid_until),
                  profile.decennale.insurer,
                )}
              />
            ) : null}
            {profile.rc_pro?.valid_until ? (
              <Guarantee
                title={t.rcProTitle}
                detail={t.decennaleUntil(
                  formatLongDate(profile.rc_pro.valid_until),
                  profile.rc_pro.insurer,
                )}
              />
            ) : null}
            {profile.diplome ? (
              <Guarantee
                title={t.diplomaTitle(fr.diplomesMetier[profile.diplome])}
                detail={t.diplomaDetail}
              />
            ) : null}
            {profile.certifications.map((c) => (
              <Guarantee
                key={`${c.type}-${c.numero}`}
                title={t.certificationTitle(c.type)}
                detail={t.certificationDetail(c.numero, formatLongDate(c.valid_until))}
              />
            ))}
            {profile.rge.length > 0 ? (
              <Guarantee
                title={t.rgeTitle}
                detail={t.rgeDetail(profile.rge.map((q) => q.domain).join(", "))}
              />
            ) : null}
          </Card>
        ) : null}

        <Card>
          <View pointerEvents="none" aria-hidden style={styles.arc}>
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
          <Text role="heading" style={styles.heading}>
            {t.score}
          </Text>
          {profile.menao_score ? <MenaoScore score={profile.menao_score} /> : null}
        </Card>

        <Card>
          <Text role="heading" style={styles.heading}>
            {t.clientReviews}
          </Text>
          {profile.score ? (
            <ScoreBreakdown score={profile.score} />
          ) : (
            <Body muted>{t.scoreEmpty}</Body>
          )}
          {profile.google ? (
            <View style={styles.google}>
              <Text style={styles.strong}>
                {t.google(
                  profile.google.rating.toLocaleString("fr-FR", { minimumFractionDigits: 1 }),
                  profile.google.count,
                )}
              </Text>
              <LinkText
                label={t.googleLink}
                onPress={() => profile.google && Linking.openURL(profile.google.url)}
              />
            </View>
          ) : null}
        </Card>

        {page.photoUrls.length > 0 ? (
          <Card>
            <Text role="heading" style={styles.heading}>
              {t.recent}
            </Text>
            <RecentPhotos urls={page.photoUrls} />
          </Card>
        ) : null}

        <Card>
          <Text role="heading" style={styles.heading}>
            {t.reviews}
          </Text>
          {page.reviews.length ? (
            page.reviews
              .slice(0, 5)
              .map((review, i) => (
                <ReviewItem
                  key={review.id}
                  review={review}
                  artisanName={profile.display_name}
                  first={i === 0}
                />
              ))
          ) : (
            <Body muted>{t.reviewsEmpty}</Body>
          )}
        </Card>

        {profile.partners.length ? (
          <Card>
            <Text role="heading" style={styles.heading}>
              {t.partners}
            </Text>
            <Body muted>{t.partnersHint(profile.display_name)}</Body>
            {profile.partners.map((partner) => (
              <View key={partner.id} style={styles.partner}>
                <HeartHandshake size={16} color={colors["primary-strong"]} />
                <View style={styles.partnerText}>
                  <Text style={styles.strong}>{partner.name}</Text>
                  {partner.trade ? <Text style={styles.meta}>{partner.trade}</Text> : null}
                </View>
              </View>
            ))}
          </Card>
        ) : null}
      </View>
    </>
  );
}

/** Chantiers récents (F-10) : grille de vignettes ouvertes en grand d'un appui. */
function RecentPhotos({ urls }: { urls: string[] }) {
  const [viewing, setViewing] = useState<number | null>(null);
  return (
    <>
      <View style={styles.grid}>
        {urls.map((uri, i) => (
          <Pressable
            key={uri}
            role="button"
            aria-label={fr.photoViewer.open(i + 1, urls.length)}
            onPress={() => setViewing(i)}
            style={({ pressed }) => [styles.gridItem, pressed && styles.pressed]}
          >
            <Image source={{ uri }} style={styles.gridPhoto} alt="" />
          </Pressable>
        ))}
      </View>
      <PhotoViewer photos={urls} index={viewing} onClose={() => setViewing(null)} />
    </>
  );
}

/** Carte d'information de la fiche (maquette) : icône, intitulé, valeur. */
function Fact({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <View style={styles.factHead}>
        <Icon size={13} color={colors["muted-foreground"]} />
        <Text style={styles.factLabel}>{label}</Text>
      </View>
      <Text style={styles.factValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function Guarantee({ title, detail }: { title: string; detail: string }) {
  return (
    <View style={styles.guarantee}>
      <ShieldCheck size={18} color={colors.success} />
      <View style={styles.guaranteeText}>
        <Text style={styles.strong}>{title}</Text>
        <Text style={styles.meta}>{detail}</Text>
      </View>
    </View>
  );
}

function ReviewItem({
  review,
  artisanName,
  first,
}: {
  review: PublicReview;
  artisanName: string;
  first: boolean;
}) {
  const stars = reviewStars(review.score);
  return (
    <View style={[styles.review, !first && styles.reviewSeparated]}>
      <View style={styles.reviewHead}>
        <View style={styles.reviewWho}>
          <Text style={styles.strong}>{review.author}</Text>
          <Text style={styles.meta}>
            {review.experienceOn
              ? t.receivedOn(formatLongDate(review.experienceOn))
              : dayFromTimestamp(review.createdAt)}
          </Text>
        </View>
        <View style={styles.verified}>
          <Check size={12} color={colors.success} strokeWidth={2.6} />
          <Text style={styles.verifiedText}>{t.verified}</Text>
        </View>
      </View>
      <View role="img" aria-label={t.stars(review.score, stars)} style={styles.stars}>
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            size={15}
            color={i < stars ? colors.primary : colors["border-strong"]}
            fill={i < stars ? colors.primary : "transparent"}
          />
        ))}
      </View>
      <Text style={styles.body}>{review.comment}</Text>
      {review.reply ? (
        <View style={styles.reply}>
          <Text style={styles.strong}>{t.replyFrom(artisanName)}</Text>
          <Body muted>{review.reply}</Body>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.85 },
  cover: { width: "100%", height: 230, backgroundColor: colors["primary-soft"] },
  back: {
    position: "absolute",
    left: spacing(4),
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 8px rgba(17, 23, 40, 0.18)",
  },
  identity: {
    gap: spacing(2.5),
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(5),
    paddingTop: spacing(4),
    paddingBottom: spacing(5),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  name: { flexShrink: 1, fontFamily: font.medium, fontSize: 22, color: colors.foreground },
  meta: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
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
  },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  badgeNow: { backgroundColor: colors["success-soft"] },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  badgeText: { fontFamily: font.medium, fontSize: 12, color: colors["primary-strong"] },
  badgeTextNow: { color: colors.success },
  facts: { marginHorizontal: -spacing(5) },
  factsContent: { gap: spacing(2.5), paddingHorizontal: spacing(5) },
  fact: {
    minWidth: 120,
    maxWidth: 220,
    gap: spacing(1),
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2.5),
  },
  factHead: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  factLabel: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
  factValue: { fontFamily: font.medium, fontSize: 13, color: colors.foreground },
  content: { gap: spacing(4), padding: spacing(5) },
  heading: { fontFamily: font.medium, fontSize: 17, color: colors.foreground },
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.foreground },
  more: { fontFamily: font.medium, fontSize: 14, color: colors["primary-strong"] },
  strong: { fontFamily: font.medium, fontSize: 14, color: colors.foreground },
  recommended: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  partner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2.5),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing(2.5),
  },
  partnerText: { flex: 1, gap: spacing(0.5) },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing(1.5) },
  tag: {
    borderRadius: radius.chip,
    backgroundColor: colors.background,
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1.5),
  },
  tagText: { fontFamily: font.regular, fontSize: 13, color: colors.foreground },
  google: {
    gap: spacing(1),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing(3),
  },
  guarantee: { flexDirection: "row", alignItems: "flex-start", gap: spacing(2.5) },
  guaranteeText: { flex: 1, gap: spacing(0.5) },
  arc: { position: "absolute", right: -6, top: 6, width: 72, height: 44 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  gridItem: { width: "31.5%", aspectRatio: 1 },
  gridPhoto: {
    width: "100%",
    height: "100%",
    borderRadius: radius.input,
    backgroundColor: colors["primary-soft"],
  },
  review: { gap: spacing(1.5) },
  reviewSeparated: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing(3) },
  reviewHead: { flexDirection: "row", alignItems: "flex-start", gap: spacing(2) },
  reviewWho: { flex: 1, gap: 2 },
  verified: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1),
    borderRadius: radius.pill,
    backgroundColor: colors["success-soft"],
    paddingHorizontal: spacing(2),
    paddingVertical: 2,
  },
  verifiedText: { fontFamily: font.medium, fontSize: 11, color: colors.success },
  stars: { flexDirection: "row", gap: 2 },
  reply: {
    gap: spacing(1),
    borderLeftWidth: 2,
    borderLeftColor: colors["primary-soft"],
    paddingLeft: spacing(3),
  },
});
