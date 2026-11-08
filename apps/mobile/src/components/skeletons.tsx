import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { HeaderBand } from "@/components/header-band";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import type { ScreenPreview } from "@/lib/screen-cache";
import { Body, Screen, Skeleton, Title } from "@/ui";
import { theme } from "@/ui/theme";

const { colors, radius, spacing } = theme;

/**
 * Écrans squelettes sur mesure (ADR 0192) : la forme exacte du contenu qui arrive (cartes des
 * demandes et des chantiers, lignes des listes, tableau de bord), avec le reflet des blocs gris.
 * L'en-tête réel reste affiché au-dessus : seul le contenu attend ses données.
 */

/** Zone en cours de chargement, annoncée aux lecteurs d'écran. */
function Loading({ children, gap = spacing(3) }: { children: ReactNode; gap?: number }) {
  return (
    <View role="progressbar" aria-label={fr.nav.loading} aria-busy style={{ gap }}>
      {children}
    </View>
  );
}

/** Bande des trois chiffres en tête des listes Demandes et Chantiers (« Nette », lot 3). */
function StripSkeleton() {
  return (
    <View style={[styles.group, styles.strip]}>
      {Array.from({ length: 3 }, (_, i) => (
        <View key={i} style={[styles.stripCell, i > 0 && styles.stripLeft]}>
          <Skeleton width={40} height={24} />
          <Skeleton width="70%" height={10} />
        </View>
      ))}
    </View>
  );
}

/** Demandes : chiffres, puis lignes avec vignette, pastilles, titre, lieu et compte à rebours. */
export function RequestCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <Loading gap={spacing(4)}>
      <StripSkeleton />
      <Skeleton width={120} height={18} />
      <View style={styles.group}>
        {Array.from({ length: count }, (_, i) => (
          <View key={i} style={[styles.row, styles.groupRow, i > 0 && styles.separator]}>
            <Skeleton width={56} height={56} style={styles.thumb} />
            <View style={styles.column}>
              <View style={styles.inline}>
                <Skeleton width={72} height={22} />
                <Skeleton width={56} height={22} />
              </View>
              <Skeleton width="85%" height={16} />
              <Skeleton width="55%" height={12} />
              <Skeleton width="40%" height={12} />
              <Skeleton height={8} />
            </View>
          </View>
        ))}
      </View>
    </Loading>
  );
}

/** Chantiers : chiffres, pastilles des filtres, puis lignes avec icône, titre et avancement. */
export function ChantierCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <Loading gap={spacing(4)}>
      <StripSkeleton />
      <View style={styles.inline}>
        <Skeleton width={72} height={36} round />
        <Skeleton width={110} height={36} round />
        <Skeleton width={140} height={36} round />
      </View>
      <View style={styles.group}>
        {Array.from({ length: count }, (_, i) => (
          <View key={i} style={[styles.groupRow, styles.column, i > 0 && styles.separator]}>
            <View style={styles.row}>
              <Skeleton width={44} height={44} style={styles.thumb} />
              <View style={styles.column}>
                <Skeleton width="75%" height={16} />
                <Skeleton width="50%" height={12} />
              </View>
            </View>
            <Skeleton width="55%" height={12} />
            <View style={styles.between}>
              <Skeleton width={102} height={20} />
              <Skeleton width={110} height={22} />
            </View>
          </View>
        ))}
      </View>
    </Loading>
  );
}

/** Carte des chiffres clés de la rubrique Argent (refonte « Nette », lot 2). */
export function FiguresSkeleton() {
  return (
    <Loading>
      <View style={[styles.card, styles.column]}>
        <Skeleton width="45%" height={14} />
        <Skeleton width="55%" height={32} />
        <Skeleton width="60%" height={12} />
      </View>
    </Loading>
  );
}

/** Filtres soulignés d'une liste (ADR 0189). */
export function FiltersSkeleton() {
  return (
    <View style={styles.filters}>
      <Skeleton width={72} height={14} />
      <Skeleton width={96} height={14} />
      <Skeleton width={84} height={14} />
    </View>
  );
}

/** Lignes d'une liste (ADR 0189) ; `avatar` : pastille ronde à gauche (messages). */
export function ListRowsSkeleton({
  rows = 5,
  avatar = false,
}: {
  rows?: number;
  avatar?: boolean;
}) {
  return (
    <Loading>
      <View style={styles.group}>
        {Array.from({ length: rows }, (_, i) => (
          <View key={i} style={[styles.listRow, i > 0 && styles.separator]}>
            {avatar ? <Skeleton width={44} height={44} round /> : null}
            <View style={styles.column}>
              <Skeleton width="60%" height={14} />
              <Skeleton width="40%" height={11} />
            </View>
            <View style={styles.side}>
              <Skeleton width={56} height={14} />
              <Skeleton width={40} height={10} />
            </View>
          </View>
        ))}
      </View>
    </Loading>
  );
}

/**
 * Fiche en cours de chargement (ADR 0193) : son titre, connu de la liste, s'affiche aussitôt ;
 * `band` : dans le bandeau bleu, comme la fiche d'une demande ou d'un chantier.
 */
export function DetailSkeleton({
  preview,
  band = false,
}: {
  preview?: ScreenPreview;
  band?: boolean;
}) {
  const blocks = (
    <Loading>
      {Array.from({ length: 3 }, (_, i) => (
        <View key={i} style={[styles.card, styles.column]}>
          <Skeleton width="40%" height={16} />
          <Skeleton height={12} />
          <Skeleton width="70%" height={12} />
        </View>
      ))}
    </Loading>
  );
  if (band && preview) {
    return <Screen band={<HeaderBand title={preview.title} />}>{blocks}</Screen>;
  }
  return (
    <Screen header={<TopBar />}>
      {preview ? <Title>{preview.title}</Title> : <Skeleton width="70%" height={28} />}
      {preview?.subtitle ? (
        <Body muted>{preview.subtitle}</Body>
      ) : preview ? null : (
        <Skeleton width="50%" height={14} />
      )}
      {blocks}
    </Screen>
  );
}

/** Tableau de bord (ADR 0245) : bandeau de l'argent, « À faire maintenant », raccourcis. */
export function DashboardSkeleton() {
  return (
    <Loading gap={spacing(6)}>
      <Skeleton height={196} style={styles.money} />
      <View style={styles.column}>
        <Skeleton width="55%" height={22} />
        <Skeleton height={72} style={styles.block} />
        <Skeleton height={72} style={styles.block} />
      </View>
      <View style={styles.kpis}>
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} height={88} style={styles.kpi} />
        ))}
      </View>
    </Loading>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing(4),
  },
  row: { flexDirection: "row", gap: spacing(3) },
  column: { flex: 1, gap: spacing(2) },
  inline: { flexDirection: "row", gap: spacing(2) },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  thumb: { borderRadius: radius.input },
  strip: { flexDirection: "row" },
  stripCell: { flex: 1, gap: spacing(2), paddingHorizontal: spacing(3), paddingVertical: 14 },
  stripLeft: { borderLeftWidth: 1, borderLeftColor: colors.border },
  groupRow: { padding: spacing(4) },
  filters: {
    flexDirection: "row",
    gap: spacing(4),
    paddingVertical: spacing(3.5),
    paddingHorizontal: spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  group: {
    overflow: "hidden",
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    minHeight: 64,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
  },
  separator: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  side: { alignItems: "flex-end", gap: spacing(1.5) },
  money: { borderRadius: 18 },
  kpis: { flexDirection: "row", flexWrap: "wrap", gap: spacing(3) },
  kpi: { flexGrow: 1, flexBasis: "30%", borderRadius: radius.card },
  block: { borderRadius: radius.card },
});
