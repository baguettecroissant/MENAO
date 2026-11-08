import { REQUEST_RESPONSE_HOURS } from "@menao/core";
import type { RequestDetail } from "@menao/validation";
import * as WebBrowser from "expo-web-browser";
import { Clock, Lock, Mail, MapPin, Phone, Sparkles } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { PhotoViewer } from "@/components/photo-viewer";
import { CardHeading, FicheButton, FicheCard, FicheTag } from "@/components/pro/fiche-kit";
import { fr } from "@/i18n/fr";
import { formatLongDate } from "@/lib/dates";
import { Card } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proRequests;
const { colors, font, radius, spacing } = theme;

/** Carte à titre (Inter Tight) des fiches : réputation du client, devis envoyé… */
export function DetailBlock({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <View style={styles.block}>
        <View style={styles.blockTitle}>
          {icon}
          <Text role="heading" style={styles.blockTitleText}>
            {title}
          </Text>
        </View>
        {children}
      </View>
    </Card>
  );
}

/** Photos du projet : vignettes ouvertes en grand d'un appui. */
function RequestPhotos({ urls }: { urls: string[] }) {
  const [viewing, setViewing] = useState<number | null>(null);
  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.photos}>
          {urls.map((url, i) => (
            <Pressable
              key={url}
              role="button"
              aria-label={t.photo(i + 1)}
              onPress={() => setViewing(i)}
            >
              <Image source={{ uri: url }} style={styles.photo} alt="" />
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <PhotoViewer photos={urls} index={viewing} onClose={() => setViewing(null)} />
    </>
  );
}

/**
 * Carte « Répondez sous » (fiche d'une demande en attente) : heures restantes, barre sur le délai
 * de réponse de 72 h, rappel de l'expiration.
 */
export function RequestCountdown({ left }: { left: { hours: number; minutes: number } }) {
  const total = REQUEST_RESPONSE_HOURS * 60;
  const share = Math.min(1, Math.max(0, (left.hours * 60 + left.minutes) / total));
  return (
    <FicheCard padding={4.5} gap={2}>
      <View style={styles.inline}>
        <Clock size={16} color={colors.label} strokeWidth={2.2} />
        <Text style={styles.countdownLabel}>{t.answerWithin}</Text>
      </View>
      <Text style={styles.countdownValue} aria-label={t.countdownLabel(left.hours, left.minutes)}>
        {t.countdownValue(left.hours, left.minutes)}
      </Text>
      <View style={styles.bar}>
        <View style={[styles.barFill, { width: `${share * 100}%` }]} />
      </View>
      <Text style={styles.meta}>{t.expiryNote(REQUEST_RESPONSE_HOURS)}</Text>
    </FicheCard>
  );
}

/** « La demande en bref » : résumé de l'IA de MENAO (ADR 0163), en grand. */
function BriefCard({ brief }: { brief: string }) {
  return (
    <FicheCard gap={3}>
      <View style={styles.spread}>
        <CardHeading title={t.brief} size={20} />
        <FicheTag text={t.briefTag} tone="primary" />
      </View>
      <Text style={styles.brief}>{brief}</Text>
      <View style={styles.noteRow}>
        <Sparkles size={14} color={colors["muted-foreground"]} />
        <Text style={styles.note}>{t.briefNote}</Text>
      </View>
    </FicheCard>
  );
}

/** « Ce que dit le client » : description en citation, message personnalisé, photos. */
function ClientWordsCard({ detail: r, photoUrls }: { detail: RequestDetail; photoUrls: string[] }) {
  return (
    <FicheCard>
      <CardHeading title={t.clientWords} />
      <Text style={styles.quote}>{`« ${r.description} »`}</Text>
      {r.message ? (
        <View style={styles.tight}>
          <Text style={styles.meta}>{t.messageForYou}</Text>
          <Text style={styles.medium}>{`« ${r.message} »`}</Text>
        </View>
      ) : null}
      {photoUrls.length > 0 ? <RequestPhotos urls={photoUrls} /> : null}
    </FicheCard>
  );
}

/** « Détails du chantier » en grille de 2 colonnes, à partir des critères de la demande. */
function DetailsCard({ detail: r }: { detail: RequestDetail }) {
  const surface = r.surface ? fr.surfaces[r.surface] : null;
  const wished =
    r.date_mode === "date" && r.date_souhaitee
      ? formatLongDate(r.date_souhaitee)
      : r.date_mode === "des_que_possible"
        ? t.dateAsap
        : t.dateUnknown;
  const cells: { label: string; value: string; note?: string }[] = [
    ...(r.rooms.length > 0
      ? [
          {
            label: t.details.room,
            value: [r.rooms.join(", "), surface].filter(Boolean).join(" · "),
          },
        ]
      : surface
        ? [{ label: t.details.surface, value: surface }]
        : []),
    ...(r.lieu_type ? [{ label: t.details.place, value: fr.lieux[r.lieu_type] }] : []),
    ...(r.work_types.length > 0
      ? [{ label: t.details.works, value: r.work_types.join(", ") }]
      : []),
    ...(r.budget ? [{ label: t.details.budget, value: fr.budgets[r.budget] }] : []),
    { label: t.details.start, value: wished },
    ...(r.autres_metiers.length > 0
      ? [
          {
            label: t.details.otherTrades,
            value: r.autres_metiers.join(", "),
            note: t.otherTradesNote,
          },
        ]
      : []),
  ];
  return (
    <FicheCard gap={4}>
      <CardHeading title={t.detailsTitle} />
      <View style={styles.grid}>
        {cells.map((cell) => (
          <View key={cell.label} style={styles.cell}>
            <Text style={styles.meta}>{cell.label}</Text>
            <Text style={styles.cellValue}>{cell.value}</Text>
            {cell.note ? <Text style={styles.cellNote}>{cell.note}</Text> : null}
          </View>
        ))}
      </View>
    </FicheCard>
  );
}

/**
 * Carte du client : prénom, créneau de rappel (demande), lieu ; coordonnées et adresse exacte
 * seulement une fois le rendez-vous fixé (décision C, ADR 0014), sinon la mention qu'elles
 * s'afficheront à ce moment-là.
 */
function ClientCard({
  detail: r,
  variant,
  onMessage,
  contactActions,
}: {
  detail: RequestDetail;
  variant: "opportunite" | "rendez-vous";
  onMessage?: () => void;
  contactActions: boolean;
}) {
  const accepted = r.status === "acceptee";
  const clientName = [r.client.first_name, r.client.last_name].filter(Boolean).join(" ");
  const phone = accepted ? r.client.phone : null;
  const email = accepted ? r.client.email : null;
  const place =
    accepted && r.adresse ? r.adresse : [r.code_postal, r.ville_nom].filter(Boolean).join(" ");
  const icon = (Icon: typeof Clock) => (
    <Icon size={16} color={colors.primary} style={styles.lineIcon} />
  );

  return (
    <FicheCard gap={3}>
      <View style={styles.person}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(r.client.first_name ?? "?").charAt(0)}</Text>
        </View>
        <View style={styles.flex}>
          <Text role="heading" style={styles.name}>
            {clientName || t.client}
          </Text>
          <Text style={styles.sub}>{t.individual}</Text>
        </View>
      </View>
      {variant === "opportunite" ? (
        <View style={styles.line}>
          {icon(Clock)}
          <Text style={styles.lineText}>
            {r.callback_mode === "plage" && r.callback_from && r.callback_to
              ? t.callbackRange(
                  r.callback_from.slice(0, 5).replace(":", "h"),
                  r.callback_to.slice(0, 5).replace(":", "h"),
                )
              : t.callbackAsap}
          </Text>
        </View>
      ) : null}
      {place ? (
        <View style={styles.line}>
          {icon(MapPin)}
          <Text style={styles.lineText}>{place}</Text>
        </View>
      ) : null}
      {phone ? (
        <View style={styles.line}>
          {icon(Phone)}
          <Text style={styles.lineText}>{phone}</Text>
        </View>
      ) : null}
      {email ? (
        <View style={styles.line}>
          {icon(Mail)}
          <Text style={styles.lineText}>{email}</Text>
        </View>
      ) : null}
      {r.hors_zone ? <Text style={styles.outside}>{t.outsideZone}</Text> : null}
      {accepted && r.lat !== null && r.lon !== null ? (
        <Pressable
          role="link"
          hitSlop={6}
          onPress={() =>
            WebBrowser.openBrowserAsync(
              `https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lon}#map=17/${r.lat}/${r.lon}`,
            )
          }
        >
          <Text style={styles.link}>{t.openMap}</Text>
        </Pressable>
      ) : null}
      {contactActions && onMessage ? (
        <FicheButton
          label={fr.proAppointment.writeClient}
          variant="secondary"
          onPress={onMessage}
        />
      ) : null}
      {contactActions && phone ? (
        <FicheButton
          label={t.call(r.client.first_name)}
          variant="secondary"
          onPress={() => Linking.openURL(`tel:${phone}`)}
        />
      ) : null}
      {!accepted ? (
        <View style={styles.noteRow}>
          <Lock size={14} color={colors["muted-foreground"]} />
          <Text style={styles.note}>{t.contactAfter}</Text>
        </View>
      ) : null}
    </FicheCard>
  );
}

/**
 * Cartes communes à la fiche d'une demande (F-17) et à celle d'un chantier (F-18, F-22) :
 * « La demande en bref », « Ce que dit le client », « Détails du chantier » et le client (en fin
 * de fiche pour une demande, en tête pour un chantier). `contactActions` : boutons « Écrire au
 * client » et « Appeler » dans la carte du client, inutiles quand la fiche a sa rangée
 * Message / Appeler / Itinéraire.
 */
export function RequestBlocks({
  detail: r,
  photoUrls,
  variant,
  onMessage,
  contactActions = true,
}: {
  detail: RequestDetail;
  photoUrls: string[];
  variant: "opportunite" | "rendez-vous";
  onMessage?: () => void;
  contactActions?: boolean;
}) {
  const client = (
    <ClientCard
      detail={r}
      variant={variant}
      onMessage={onMessage}
      contactActions={contactActions}
    />
  );
  return (
    <>
      {variant === "rendez-vous" ? client : null}
      {r.artisan_brief ? <BriefCard brief={r.artisan_brief} /> : null}
      <ClientWordsCard detail={r} photoUrls={photoUrls} />
      <DetailsCard detail={r} />
      {variant === "opportunite" ? client : null}
    </>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing(3) },
  blockTitle: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  blockTitleText: {
    flexShrink: 1,
    fontFamily: font.display,
    fontSize: 18,
    letterSpacing: -0.36,
    color: colors.foreground,
  },
  inline: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  spread: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing(3),
  },
  countdownLabel: { fontFamily: font.semibold, fontSize: 14, color: colors.label },
  countdownValue: {
    fontFamily: font.display,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.8,
    color: colors.foreground,
  },
  bar: {
    height: 8,
    overflow: "hidden",
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  barFill: { height: 8, borderRadius: 4, backgroundColor: colors.primary },
  brief: { fontFamily: font.regular, fontSize: 17, lineHeight: 26, color: colors.foreground },
  noteRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing(1.5) },
  note: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
  quote: {
    overflow: "hidden",
    borderRadius: radius.input,
    backgroundColor: colors.background,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3.5),
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 23,
    color: colors.foreground,
  },
  tight: { gap: spacing(1) },
  meta: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  medium: { fontFamily: font.medium, fontSize: 15, lineHeight: 22, color: colors.foreground },
  photos: { flexDirection: "row", gap: spacing(2.5) },
  photo: {
    width: 86,
    height: 86,
    borderRadius: radius.input,
    backgroundColor: colors["primary-soft"],
  },
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: spacing(4) },
  cell: { width: "50%", paddingRight: spacing(4), gap: 2 },
  cellValue: { fontFamily: font.semibold, fontSize: 15, lineHeight: 21, color: colors.foreground },
  cellNote: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: colors.label },
  person: { flexDirection: "row", alignItems: "center", gap: spacing(3) },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors["primary-soft"],
  },
  avatarText: { fontFamily: font.bold, fontSize: 16, color: colors["primary-strong"] },
  flex: { flex: 1 },
  name: { fontFamily: font.semibold, fontSize: 16, color: colors.foreground },
  sub: { fontFamily: font.regular, fontSize: 14, color: colors["muted-foreground"] },
  line: { flexDirection: "row", alignItems: "flex-start", gap: spacing(2.5) },
  lineIcon: { marginTop: 2, flexShrink: 0 },
  lineText: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.foreground,
  },
  link: { fontFamily: font.semibold, fontSize: 14, color: colors["primary-strong"] },
  outside: {
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.warning,
    backgroundColor: colors["warning-soft"],
    borderRadius: radius.input,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    overflow: "hidden",
  },
});
