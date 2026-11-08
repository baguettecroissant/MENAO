import { availability, parisToday, respondsFast, reviewStars } from "@menao/core";
import {
  BadgeCheck,
  Check,
  Clock,
  HeartHandshake,
  MapPin,
  ShieldCheck,
  Star,
  Wrench,
  type LucideIcon,
} from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MenaoScore } from "@/components/menao-score";
import { PhotoViewer } from "@/components/photo-viewer";
import { CardHeading, FicheCard, FicheTag } from "@/components/pro/fiche-kit";
import { ArtisanAvatar } from "@/components/request-kit";
import { ScoreBreakdown } from "@/components/score-breakdown";
import { fr } from "@/i18n/fr";
import { formatLongDate } from "@/lib/dates";
import type { ArtisanPage, PublicReview } from "@/lib/requests";
import { Body, LinkText } from "@/ui";
import { theme } from "@/ui/theme";

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
 * Fiche « Nette » (lot 12, maquette « FicheParcoursNette » transposée) : grand en-tête (photo
 * ronde, nom, pastilles, Score MENAO dans une pastille), puis les rubriques en cartes. L'écran qui
 * l'affiche fournit la barre du haut et le bouton collé en bas.
 * Jamais de téléphone ni d'e-mail avant l'acceptation de la demande.
 */
export function ArtisanProfileView({ page }: { page: ArtisanPage }) {
  const { profile } = page;
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

  return (
    <>
      <View style={styles.identity}>
        <View style={styles.identityRow}>
          <ArtisanAvatar name={profile.display_name} uri={page.avatarUrl} size={72} />
          <View style={styles.identityText}>
            <View style={styles.nameRow}>
              <Text role="heading" aria-level={1} style={styles.name}>
                {profile.display_name}
              </Text>
              <BadgeCheck size={18} color={colors.primary} style={styles.nameIcon} />
            </View>
            {trade || profile.company_name ? (
              <Text style={styles.meta}>
                {[trade, profile.company_name].filter(Boolean).join(" · ")}
              </Text>
            ) : null}
          </View>
        </View>
        {profile.recommended_by ? (
          <View style={styles.recommended}>
            <HeartHandshake size={14} color={colors.primary} />
            <Text style={styles.meta}>{t.recommendedBy(profile.recommended_by.name)}</Text>
          </View>
        ) : null}
        <View style={styles.badges}>
          {profile.verified ? (
            <View style={styles.verifiedBadge}>
              <ShieldCheck size={14} color={colors.success} />
              <Text style={styles.verifiedBadgeText}>{t.verifiedBadge}</Text>
            </View>
          ) : null}
          <FicheTag
            dot
            tone={
              avail.kind === "paused" ? "neutral" : avail.kind === "from" ? "warning" : "success"
            }
            text={
              avail.kind === "paused"
                ? t.unavailable
                : avail.kind === "from"
                  ? fr.results.availableFrom(formatLongDate(avail.date))
                  : fr.results.availableNow
            }
          />
        </View>
        {profile.menao_score ? (
          <View style={styles.scorePill}>
            <Text style={styles.scoreValue}>{Math.round(profile.menao_score.score)}</Text>
            <Text style={styles.scoreLabel}>
              {t.score} {t.scoreOutOf}
            </Text>
          </View>
        ) : null}
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

      {profile.presentation ? (
        <Section>
          <CardHeading title={t.about(profile.display_name)} />
          <Text style={styles.body} numberOfLines={aboutOpen ? undefined : ABOUT_LINES}>
            {profile.presentation}
          </Text>
          {profile.presentation.length > 280 ? (
            <Pressable role="button" hitSlop={8} onPress={() => setAboutOpen((open) => !open)}>
              <Text style={styles.more}>{aboutOpen ? t.seeLess : t.seeMore}</Text>
            </Pressable>
          ) : null}
        </Section>
      ) : null}

      {profile.work_types.length > 0 ? (
        <Section>
          <CardHeading title={t.expertise} />
          <View style={styles.tags}>
            {profile.work_types.map((work) => (
              <View key={work.code} style={styles.tag}>
                <Text style={styles.tagText}>{work.label}</Text>
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      {profile.verified ||
      profile.decennale_exempt ||
      profile.decennale?.valid_until ||
      profile.rc_pro?.valid_until ||
      profile.diplome ||
      profile.certifications.length > 0 ||
      profile.rge.length > 0 ? (
        <Section>
          <CardHeading title={t.guarantees} />
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
        </Section>
      ) : null}

      <Section>
        <CardHeading title={t.score} />
        {profile.menao_score ? <MenaoScore score={profile.menao_score} /> : null}
      </Section>

      <Section>
        <CardHeading title={t.clientReviews} />
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
      </Section>

      {page.photoUrls.length > 0 ? (
        <Section>
          <CardHeading title={t.recent} />
          <RecentPhotos urls={page.photoUrls} />
        </Section>
      ) : null}

      <Section>
        <CardHeading title={t.reviews} />
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
      </Section>

      {profile.partners.length ? (
        <Section>
          <CardHeading title={t.partners} />
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
        </Section>
      ) : null}
    </>
  );
}

/** Rubrique de la fiche : carte blanche bordée, titre en Inter Tight. */
function Section({ children }: { children: ReactNode }) {
  return (
    <FicheCard padding={4.5} gap={3}>
      {children}
    </FicheCard>
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
  identity: {
    gap: spacing(3),
    padding: spacing(4.5),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  identityRow: { flexDirection: "row", alignItems: "center", gap: spacing(3.5) },
  identityText: { flex: 1, minWidth: 0, gap: spacing(1) },
  nameRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing(1.5) },
  name: {
    flexShrink: 1,
    fontFamily: font.display,
    fontSize: 24,
    lineHeight: 27,
    letterSpacing: -0.6,
    color: colors.foreground,
  },
  nameIcon: { marginTop: 4, flexShrink: 0 },
  meta: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
  badges: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing(2) },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.5),
    borderRadius: radius.chip,
    backgroundColor: colors["success-soft"],
    paddingHorizontal: 9,
    paddingVertical: spacing(1),
  },
  verifiedBadgeText: { fontFamily: font.bold, fontSize: 12, color: colors.success },
  // Score MENAO dans une pastille bleu clair (maquette).
  scorePill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing(2),
    borderRadius: radius.pill,
    backgroundColor: colors["primary-soft"],
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2),
  },
  scoreValue: {
    fontFamily: font.display,
    fontSize: 22,
    letterSpacing: -0.5,
    color: colors["primary-strong"],
  },
  scoreLabel: { fontFamily: font.semibold, fontSize: 13, color: colors["primary-strong"] },
  facts: { marginHorizontal: -spacing(4.5) },
  factsContent: { gap: spacing(2.5), paddingHorizontal: spacing(4.5) },
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
