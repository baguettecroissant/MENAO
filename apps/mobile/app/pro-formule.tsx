import { Check, Minus } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { PageHead } from "@/components/pro/dossier-kit";
import { FicheCard, FicheScreen, FicheSkeleton } from "@/components/pro/fiche-kit";
import { ProgressBar } from "@/components/pro/tools-kit";
import { withTeamPermission } from "@/components/team-gate";
import { fr } from "@/i18n/fr";
import { loadMyPlan, type MyPlan } from "@/lib/plan";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proPlan;
const { colors, font, spacing } = theme;

/**
 * « Ma formule » dans l'application (lot 69, ADR 0363, maquette « MaFormuleApp ») : la formule en
 * cours, les compteurs du mois, ce qu'elle comprend par thème, puis ce qu'elle ne comprend pas.
 * Ni prix, ni bouton, ni lien d'achat (CLAUDE.md règle 10) : l'écran montre ce que l'artisan a.
 */
function PlanScreen() {
  const [plan, reload] = useFocusData(loadMyPlan);
  if (plan === undefined) return <FicheSkeleton />;
  return (
    <FicheScreen onRefresh={reload}>
      <PageHead title={t.title} />
      {plan === null ? <Notice tone="error">{fr.errors.generic}</Notice> : <Plan plan={plan} />}
    </FicheScreen>
  );
}

function Plan({ plan }: { plan: MyPlan }) {
  const voiceTotal = plan.voice ? plan.voice.includedMinutes + plan.voice.topUpMinutes : 0;
  return (
    <>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>{t.yourPlan}</Text>
        <Text role="heading" style={styles.name}>
          {plan.name}
        </Text>
        <Text style={styles.state}>{plan.state}</Text>
      </View>

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
            color={
              plan.voice.level === "ok"
                ? colors.primary
                : plan.voice.level === "alerte"
                  ? colors.warning
                  : colors.danger
            }
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

      {plan.groups.map((group) => (
        <FicheCard key={group.title} padding={4} gap={0}>
          <Text style={[styles.cardTitle, styles.groupTitle]}>{group.title}</Text>
          {group.features.map((feature) => (
            <View key={feature.label} style={styles.line}>
              <Check size={17} strokeWidth={3} color={colors.success} />
              <Text style={styles.lineText}>{feature.label}</Text>
              {feature.value ? <Text style={styles.lineValue}>{feature.value}</Text> : null}
            </View>
          ))}
        </FicheCard>
      ))}

      {plan.excluded.length > 0 ? (
        <FicheCard padding={4} gap={0}>
          <Text style={[styles.cardTitle, styles.groupTitle]}>{t.excluded}</Text>
          {plan.excluded.map((label) => (
            <View key={label} style={styles.line}>
              <Minus size={17} strokeWidth={3} color={colors["border-strong"]} />
              <Text style={[styles.lineText, styles.muted]}>{label}</Text>
            </View>
          ))}
        </FicheCard>
      ) : null}
      <Text style={styles.note}>{fr.account.subscriptionText}</Text>
    </>
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
    borderRadius: 20,
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
  cardTitle: { fontFamily: font.bold, fontSize: 15, color: colors.foreground },
  groupTitle: { marginBottom: spacing(2) },
  gauge: { gap: spacing(1.5) },
  gaugeHead: { flexDirection: "row", justifyContent: "space-between", gap: spacing(3) },
  gaugeLabel: { fontFamily: font.bold, fontSize: 13.5, color: colors.foreground },
  gaugeValue: { fontFamily: font.regular, fontSize: 13.5, color: colors["muted-foreground"] },
  line: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2.5),
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  lineText: { flex: 1, fontFamily: font.regular, fontSize: 14.5, color: colors.foreground },
  lineValue: { fontFamily: font.semibold, fontSize: 13.5, color: colors.label },
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
