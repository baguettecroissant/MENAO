import {
  CHANTIER_STEPS,
  chantierNext,
  chantierStepIndex,
  isExampleId,
  type ChantierStatus,
} from "@menao/core";
import { CalendarDays, ChevronRight, Clock, HardHat } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ExampleBadge } from "@/components/examples";
import { FicheTag, TAG_TONES, type FicheTone } from "@/components/pro/fiche-kit";
import { fr } from "@/i18n/fr";
import { formatDayMonthShort, formatTime } from "@/lib/format";
import { prefetchChantier } from "@/lib/prefetch";
import type { ArtisanChantierRow } from "@/lib/pro-chantiers";
import { theme } from "@/ui/theme";

const t = fr.proChantiers;
const { colors, font, spacing } = theme;

/**
 * Couleur de l'état, d'après les maquettes « Nette » (lot 3) et comme sur le site : bleu avant la
 * signature, orange quand l'acompte est attendu, vert pendant les travaux, gris une fois terminé.
 */
export function chantierTone(status: ChantierStatus): FicheTone {
  switch (status) {
    case "demande_envoyee":
    case "rdv_planifie":
    case "devis_envoye":
    case "devis_en_revision":
      return "primary";
    case "devis_signe":
      return "warning";
    case "en_litige":
      return "danger";
    case "cloture":
    case "annule":
    case "devis_refuse":
      return "neutral";
    default:
      return "success";
  }
}

/** Prochaine étape : rendez-vous ou démarrage daté, sinon un libellé court selon l'état. */
function nextStep(r: ArtisanChantierRow, status: ChantierStatus) {
  // Date à venir, devis à envoyer une fois la visite passée, ou l'attendu (@menao/core).
  const next = chantierNext({ status, appointment_at: r.appointment_at, start_at: r.start_at });
  if (next.kind === "devis_a_envoyer") return { text: t.quoteToSend, dated: false };
  if (!next.at) return { text: t.next[status], dated: false };
  const day = formatDayMonthShort(next.at);
  const time = formatTime(next.at);
  return {
    text: next.kind === "rdv" ? t.appointmentOn(day, time) : t.startOn(day, time),
    dated: true,
  };
}

/** Étape en cours (« Signature · 1/5 », « Terminé ») et sa phrase pour les lecteurs d'écran. */
function stepTexts(step: number) {
  const total = CHANTIER_STEPS.length;
  const current = CHANTIER_STEPS[step];
  if (!current) return { label: t.stepsDone, spoken: t.stepsDoneSpoken };
  const name = fr.chantier.steps[current];
  return { label: t.step(name, step + 1, total), spoken: t.stepSpoken(name, step + 1, total) };
}

/** Avancement en 5 segments : vert franchi, bleu en cours, gris à venir. */
function Progress({ step }: { step: number }) {
  const total = CHANTIER_STEPS.length;
  const { label, spoken } = stepTexts(step);
  return (
    <View
      role="progressbar"
      aria-label={spoken}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={Math.min(step, total)}
      style={styles.progress}
    >
      <View style={styles.segments}>
        {CHANTIER_STEPS.map((s, i) => (
          <View
            key={s}
            style={[
              styles.segment,
              {
                backgroundColor:
                  i < step ? colors.success : i === step ? colors.primary : colors.border,
              },
            ]}
          />
        ))}
      </View>
      <Text style={styles.progressLabel}>{label}</Text>
    </View>
  );
}

/**
 * Chantier de l'artisan dans une liste (F-18, refonte « Nette », lot 3) : icône à la couleur de
 * l'état, titre, ville et client, prochaine étape, avancement en 5 étapes et pastille d'état.
 * Une ligne d'un `ListGroup`.
 */
export function ChantierListRow({
  row: r,
  onPress,
}: {
  row: ArtisanChantierRow;
  onPress: () => void;
}) {
  const status = r.status as ChantierStatus;
  const tone = chantierTone(status);
  const client = [r.client_first_name, r.client_last_name].filter(Boolean).join(" ");
  const place = [r.ville_nom || r.code_postal, client].filter(Boolean).join(" · ");
  const next = nextStep(r, status);
  // Pas d'avancement pour un chantier annulé, un devis refusé ou un litige.
  const step = chantierStepIndex(status);
  const NextIcon = next.dated ? CalendarDays : Clock;
  return (
    <Pressable
      role="link"
      aria-label={[
        t.status[status],
        r.title,
        place,
        next.text,
        step === null ? null : stepTexts(step).spoken,
      ]
        .filter(Boolean)
        .join(", ")}
      onPressIn={() => prefetchChantier(r.chantier_id, r.title, place)}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: TAG_TONES[tone].bg }]}>
          <HardHat size={20} color={TAG_TONES[tone].fg} />
        </View>
        <View style={styles.texts}>
          <Text style={styles.title}>{r.title}</Text>
          {place ? <Text style={styles.meta}>{place}</Text> : null}
          {isExampleId(r.chantier_id) ? (
            <View style={styles.badge}>
              <ExampleBadge />
            </View>
          ) : null}
        </View>
        <View style={styles.chevron}>
          <ChevronRight size={18} color={colors["muted-foreground"]} />
        </View>
      </View>
      <View style={styles.next}>
        <NextIcon size={14} color={colors["muted-foreground"]} />
        <Text style={styles.nextText}>{next.text}</Text>
      </View>
      <View style={[styles.foot, step === null && styles.footEnd]}>
        {step === null ? null : <Progress step={step} />}
        <FicheTag text={t.status[status]} tone={tone} dot />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing(3),
    // Fond plein, comme les autres lignes des listes (ADR 0196).
    backgroundColor: colors.surface,
    padding: spacing(4),
  },
  pressed: { backgroundColor: colors.background },
  head: { flexDirection: "row", alignItems: "flex-start", gap: spacing(3) },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  texts: { flex: 1, minWidth: 0, gap: 3 },
  title: { fontFamily: font.semibold, fontSize: 16, lineHeight: 21, color: colors.foreground },
  meta: { fontFamily: font.regular, fontSize: 14, color: colors["muted-foreground"] },
  badge: { marginTop: spacing(1), alignItems: "flex-start" },
  chevron: { paddingTop: spacing(3) },
  next: { flexDirection: "row", alignItems: "center", gap: 7 },
  nextText: { flexShrink: 1, fontFamily: font.semibold, fontSize: 14, color: colors.label },
  foot: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing(3),
  },
  footEnd: { justifyContent: "flex-end" },
  progress: { gap: 6 },
  segments: { flexDirection: "row", gap: 3 },
  segment: { width: 18, height: 6, borderRadius: 3 },
  progressLabel: { fontFamily: font.semibold, fontSize: 13, color: colors.label },
});
