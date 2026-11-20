import { planHighlights, type PlanHighlightKey } from "@menao/core";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Euro,
  FileCheck,
  Inbox,
  Layers,
  LayoutGrid,
  Minus,
  Phone,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useState, type ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, ReduceMotion } from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { PageHead } from "@/components/pro/dossier-kit";
import { FicheCard, FicheScreen, FicheSkeleton } from "@/components/pro/fiche-kit";
import { ProgressBar } from "@/components/pro/tools-kit";
import { withTeamPermission } from "@/components/team-gate";
import { fr } from "@/i18n/fr";
import { haptic } from "@/lib/haptics";
import { loadMyPlan, type MyPlan } from "@/lib/plan";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice, Tappable } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proPlan;
const { colors, font, spacing } = theme;

// Mêmes icônes de rubrique que le comparatif du site (ADR 0368).
const GROUP_ICONS: Record<string, LucideIcon> = {
  "Demandes de chantier": Inbox,
  "Manon, votre secrétaire": Phone,
  "Devis et plans": FileCheck,
  "Votre argent": Euro,
  "Chantiers, équipe et visibilité": Users,
};
const HIGHLIGHT_ICONS: Record<PlanHighlightKey, LucideIcon> = {
  secretary: Phone,
  requests: Inbox,
  quote: FileCheck,
  quotes: FileCheck,
  payments: Wallet,
  money: Euro,
  margin: TrendingUp,
  tenders: Layers,
  team: Users,
};
const CARD_WIDTH = 200;
const CARD_GAP = spacing(2.5);
// Au-delà, la précision passe sous le libellé pour ne pas l'écraser.
const SHORT_VALUE = 12;
const SHORT_TERM_VALUE = 16;

/**
 * « Ma formule » dans l'application (lot 69, ADR 0363 ; repensée au lot 71, ADR 0369, maquette
 * « MaFormuleAppV2 ») : la formule et ce qu'elle apporte d'abord (bande de cartes, compteurs
 * dedans), le mois, puis le détail en cinq rubriques repliables, « En plus » marquant ce que Base
 * n'a pas. Ni prix, ni bouton, ni lien d'achat, ni nom de formule dans « Non compris »
 * (CLAUDE.md règle 10) : l'écran montre ce que l'artisan a.
 */
function PlanScreen() {
  const [plan, reload] = useFocusData(loadMyPlan);
  const { arret } = useLocalSearchParams<{ arret?: string }>();
  if (plan === undefined) return <FicheSkeleton />;
  return (
    <FicheScreen onRefresh={reload}>
      <PageHead title={t.title} />
      {arret === "ok" ? <Notice tone="success">{t.term.stopped}</Notice> : null}
      {plan === null ? <Notice tone="error">{fr.errors.generic}</Notice> : <Plan plan={plan} />}
    </FicheScreen>
  );
}

function Plan({ plan }: { plan: MyPlan }) {
  const voiceTotal = plan.voice ? plan.voice.includedMinutes + plan.voice.topUpMinutes : 0;
  const shownName = plan.code ? plan.name : t.names.base;
  return (
    <>
      <Hero plan={plan} />
      {plan.term && (plan.term.rows.length > 0 || plan.term.canStop) ? (
        <Term term={plan.term} />
      ) : null}

      <View style={styles.sectionHead}>
        <Text role="heading" style={styles.sectionTitle}>
          {t.highlightsTitle(shownName)}
        </Text>
        <Text style={styles.sectionMeta}>{t.swipe}</Text>
      </View>
      <Highlights plan={plan} />

      <FicheCard padding={4} gap={3.5}>
        <Text style={styles.cardTitle}>{t.month}</Text>
        <Gauge
          label={t.usage.requests}
          value={
            plan.requests.limit === null
              ? t.usage.unlimited(plan.requests.received)
              : t.usage.of(plan.requests.received, plan.requests.limit)
          }
          current={plan.requests.received}
          total={plan.requests.limit}
        />
        {plan.voice && voiceTotal > 0 ? (
          <Gauge
            label={t.usage.voice}
            value={t.usage.remaining(plan.voice.remainingMinutes, voiceTotal)}
            current={plan.voice.remainingMinutes}
            total={voiceTotal}
            color={voiceColor(plan.voice.level)}
          />
        ) : null}
        {plan.seats && plan.seats.total > 1 ? (
          <Gauge
            label={t.usage.seats}
            value={t.usage.of(plan.seats.used, plan.seats.total)}
            current={plan.seats.used}
            total={plan.seats.total}
          />
        ) : null}
      </FicheCard>

      <View style={styles.sectionHead}>
        <Text role="heading" style={styles.sectionTitle}>
          {t.detailTitle(shownName)}
        </Text>
        <Text style={styles.sectionMeta}>{t.count(plan.included)}</Text>
      </View>
      {plan.groups.map((group, index) => (
        <Rubric
          key={group.title}
          icon={GROUP_ICONS[group.title] ?? LayoutGrid}
          title={group.title}
          count={group.features.length}
          // Premium et Entreprise : les deux premières rubriques ouvertes, pour voir « En plus ».
          initiallyOpen={plan.added > 0 && index < 2}
        >
          {group.features.map((feature) => (
            <View key={feature.label} style={styles.line}>
              <Check size={16} strokeWidth={3} color={colors.success} />
              {feature.value && feature.value.length > SHORT_VALUE ? (
                <View style={styles.lineStack}>
                  <Text style={[styles.lineText, styles.stacked]}>{feature.label}</Text>
                  <Text style={styles.lineValue}>{feature.value}</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.lineText}>{feature.label}</Text>
                  {feature.value ? <Text style={styles.lineValue}>{feature.value}</Text> : null}
                </>
              )}
              {feature.plus ? (
                <Text style={styles.plus} aria-label={t.plusLabel}>
                  {t.plus}
                </Text>
              ) : null}
            </View>
          ))}
        </Rubric>
      ))}

      {plan.excluded.length > 0 ? (
        <Rubric icon={Layers} title={t.excluded} count={plan.excluded.length} muted>
          {plan.excluded.map((label) => (
            <View key={label} style={styles.line}>
              <Minus size={16} strokeWidth={3} color={colors["border-strong"]} />
              <Text style={[styles.lineText, styles.muted]}>{label}</Text>
            </View>
          ))}
        </Rubric>
      ) : null}
      <Text style={styles.note}>{fr.account.subscriptionText}</Text>
    </>
  );
}

/**
 * Les dates qui comptent (maquette du lot 74, écran 3) et l'arrêt, dans MENAO. Ni moyen de
 * paiement, ni changement de formule dans l'application (CLAUDE.md règle 10).
 */
function Term({ term }: { term: NonNullable<MyPlan["term"]> }) {
  return (
    <FicheCard padding={4} gap={0}>
      <Text role="heading" style={[styles.cardTitle, styles.termTitle]}>
        {t.termTitle}
      </Text>
      {term.rows.map(([label, value], index) => {
        // Valeur longue sous le libellé, pour ne pas couper les dates (comme le détail plus bas).
        const stacked = value.length > SHORT_TERM_VALUE;
        return (
          <View
            key={label}
            style={[
              styles.termRow,
              stacked && styles.termRowStacked,
              index > 0 && styles.termRowBorder,
            ]}
          >
            <Text style={styles.termLabel}>{label}</Text>
            <Text style={[styles.termValue, stacked && styles.termValueStacked]}>{value}</Text>
          </View>
        );
      })}
      {term.canStop ? (
        <Tappable
          role="link"
          onPress={() => {
            haptic.select();
            router.push("/pro-formule-arreter");
          }}
          scaleTo={0.985}
          style={[styles.termRow, styles.termRowBorder, styles.stopLink]}
        >
          <Text style={styles.stopText}>{t.term.stopLink}</Text>
          <ChevronRight size={18} color={colors["muted-foreground"]} />
        </Tappable>
      ) : null}
    </FicheCard>
  );
}

function voiceColor(level: NonNullable<MyPlan["voice"]>["level"]): string {
  return level === "ok" ? colors.primary : level === "alerte" ? colors.warning : colors.danger;
}

function Hero({ plan }: { plan: MyPlan }) {
  return (
    <View style={styles.hero}>
      <Svg
        style={StyleSheet.absoluteFill}
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        aria-hidden
      >
        <Defs>
          <LinearGradient id="formule" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.foreground} />
            <Stop offset="1" stopColor="#1d2a5c" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#formule)" />
      </Svg>
      <Text style={styles.eyebrow}>{t.yourPlan}</Text>
      <Text role="heading" style={styles.name}>
        {plan.name}
      </Text>
      <Text style={styles.state}>{plan.state}</Text>
      <Text style={styles.summary}>
        {plan.added > 0 ? t.summary.added(plan.added) : t.summary.included(plan.included)}
      </Text>
    </View>
  );
}

function Highlights({ plan }: { plan: MyPlan }) {
  const h = t.highlights;
  const cards = planHighlights(plan.column).map((key) => {
    const icon = HIGHLIGHT_ICONS[key];
    if (key === "secretary") {
      const voice = plan.voice;
      const total = voice ? voice.includedMinutes + voice.topUpMinutes : 0;
      return (
        <HighlightCard key={key} icon={icon} title={h.secretary.title} text={h.secretary.text}>
          {voice && total > 0 ? (
            <Meter
              label={t.usage.remaining(voice.remainingMinutes, total)}
              current={voice.remainingMinutes}
              total={total}
              color={voiceColor(voice.level)}
            />
          ) : null}
        </HighlightCard>
      );
    }
    if (key === "requests") {
      return (
        <HighlightCard
          key={key}
          icon={icon}
          title={h.requests.title(plan.requests.limit)}
          text={h.requests.text}
        >
          <Meter
            label={h.requests.meta(plan.requests.received)}
            current={plan.requests.received}
            total={plan.requests.limit}
          />
        </HighlightCard>
      );
    }
    if (key === "team") {
      return (
        <HighlightCard key={key} icon={icon} title={h.team.title} text={h.team.text}>
          {plan.seats && plan.seats.total > 1 ? (
            <Meter
              label={t.usage.of(plan.seats.used, plan.seats.total)}
              current={plan.seats.used}
              total={plan.seats.total}
            />
          ) : null}
        </HighlightCard>
      );
    }
    return <HighlightCard key={key} icon={icon} title={h[key].title} text={h[key].text} />;
  });
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={CARD_WIDTH + CARD_GAP}
      decelerationRate="fast"
      aria-label={t.highlightsLabel}
      style={styles.band}
      contentContainerStyle={styles.bandContent}
    >
      {cards}
    </ScrollView>
  );
}

function HighlightCard({
  icon: Icon,
  title,
  text,
  children,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <View style={styles.highlight}>
      <View style={styles.iconTile}>
        <Icon size={18} color={colors["primary-strong"]} />
      </View>
      <Text style={styles.highlightTitle}>{title}</Text>
      <Text style={styles.highlightText}>{text}</Text>
      {children}
    </View>
  );
}

function Meter({
  label,
  current,
  total,
  color = colors.primary,
}: {
  label: string;
  current: number;
  total: number | null;
  color?: string;
}) {
  return (
    <View style={styles.meter}>
      <Text style={styles.meterLabel}>{label}</Text>
      {total !== null && total > 0 ? (
        <ProgressBar value={Math.min(current, total)} target={total} label={label} color={color} />
      ) : null}
    </View>
  );
}

function Rubric({
  icon: Icon,
  title,
  count,
  initiallyOpen = false,
  muted = false,
  children,
}: {
  icon: LucideIcon;
  title: string;
  count: number;
  initiallyOpen?: boolean;
  muted?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <View style={styles.rubric}>
      <Tappable
        role="button"
        aria-expanded={open}
        aria-label={`${title}, ${t.count(count)}`}
        onPress={() => {
          haptic.select();
          setOpen((value) => !value);
        }}
        scaleTo={0.985}
        style={styles.rubricHead}
      >
        <View style={[styles.iconTile, muted && styles.iconTileMuted]}>
          <Icon size={18} color={muted ? colors["muted-foreground"] : colors["primary-strong"]} />
        </View>
        <Text style={[styles.rubricTitle, muted && styles.muted]}>{title}</Text>
        <Text style={styles.sectionMeta}>{count}</Text>
        <View style={open ? styles.chevronOpen : undefined}>
          <ChevronDown size={18} color={colors["muted-foreground"]} />
        </View>
      </Tappable>
      {open ? (
        <Animated.View
          entering={FadeIn.duration(200).reduceMotion(ReduceMotion.System)}
          style={styles.rubricBody}
        >
          {children}
        </Animated.View>
      ) : null}
    </View>
  );
}

function Gauge({
  label,
  value,
  current,
  total,
  color = colors.primary,
}: {
  label: string;
  value: string;
  current: number;
  /** Limite ; null : illimité, sans barre. */
  total: number | null;
  color?: string;
}) {
  return (
    <View style={styles.gauge}>
      <View style={styles.gaugeHead}>
        <Text style={styles.gaugeLabel}>{label}</Text>
        <Text style={styles.gaugeValue}>{value}</Text>
      </View>
      {total !== null && total > 0 ? (
        <ProgressBar value={Math.min(current, total)} target={total} label={label} color={color} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing(1.5),
    padding: spacing(4.5),
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: colors.foreground,
  },
  eyebrow: {
    fontFamily: font.bold,
    fontSize: 12,
    letterSpacing: 1,
    color: "rgba(255, 255, 255, 0.7)",
  },
  name: {
    fontFamily: font.display,
    fontSize: 30,
    letterSpacing: -0.9,
    color: colors["primary-foreground"],
  },
  state: { fontFamily: font.regular, fontSize: 14, color: "rgba(255, 255, 255, 0.85)" },
  summary: {
    alignSelf: "flex-start",
    marginTop: spacing(2),
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    fontFamily: font.semibold,
    fontSize: 13,
    color: colors["primary-foreground"],
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: spacing(3),
    marginTop: spacing(1),
  },
  sectionTitle: {
    flexShrink: 1,
    fontFamily: font.display,
    fontSize: 19,
    letterSpacing: -0.4,
    color: colors.foreground,
  },
  sectionMeta: { fontFamily: font.regular, fontSize: 12.5, color: colors["muted-foreground"] },
  band: { marginHorizontal: -spacing(4) },
  bandContent: { gap: CARD_GAP, paddingHorizontal: spacing(4) },
  highlight: {
    width: CARD_WIDTH,
    minHeight: 168,
    gap: spacing(1.75),
    padding: spacing(3.5),
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  iconTile: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors["primary-soft"],
  },
  iconTileMuted: { backgroundColor: colors.background },
  highlightTitle: {
    fontFamily: font.bold,
    fontSize: 14.5,
    lineHeight: 19,
    color: colors.foreground,
  },
  highlightText: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: colors.label },
  meter: { marginTop: "auto", gap: spacing(1.5) },
  meterLabel: { fontFamily: font.semibold, fontSize: 12.5, color: colors.foreground },
  cardTitle: { fontFamily: font.bold, fontSize: 15, color: colors.foreground },
  termTitle: { paddingBottom: spacing(2) },
  termRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: spacing(3),
    paddingVertical: spacing(2.75),
  },
  termRowStacked: { flexDirection: "column", alignItems: "flex-start", gap: 2 },
  termRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  termLabel: { fontFamily: font.regular, fontSize: 14, color: colors.label },
  termValue: {
    flexShrink: 1,
    textAlign: "right",
    fontFamily: font.semibold,
    fontSize: 14,
    color: colors.foreground,
  },
  termValueStacked: { textAlign: "left" },
  stopLink: { alignItems: "center" },
  stopText: { fontFamily: font.semibold, fontSize: 14.5, color: colors.label },
  gauge: { gap: spacing(1.5) },
  gaugeHead: { flexDirection: "row", justifyContent: "space-between", gap: spacing(3) },
  gaugeLabel: { fontFamily: font.bold, fontSize: 13.5, color: colors.foreground },
  gaugeValue: { fontFamily: font.regular, fontSize: 13.5, color: colors["muted-foreground"] },
  rubric: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  rubricHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2.75),
    padding: spacing(3.5),
    paddingHorizontal: spacing(4),
  },
  rubricTitle: { flex: 1, fontFamily: font.bold, fontSize: 15, color: colors.foreground },
  chevronOpen: { transform: [{ rotate: "180deg" }] },
  rubricBody: { paddingHorizontal: spacing(4), paddingBottom: spacing(1) },
  line: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2.5),
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  lineStack: { flex: 1, gap: 2 },
  stacked: { flex: 0 },
  lineText: { flex: 1, fontFamily: font.regular, fontSize: 14.5, color: colors.foreground },
  lineValue: { fontFamily: font.semibold, fontSize: 13, color: colors.label },
  plus: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: colors["primary-soft"],
    fontFamily: font.bold,
    fontSize: 11,
    color: colors["primary-strong"],
  },
  muted: { color: colors["muted-foreground"] },
  note: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
});

// Le patron seulement, comme « Paiements » (ADR 0241).
export default withTeamPermission("subscription", PlanScreen);
