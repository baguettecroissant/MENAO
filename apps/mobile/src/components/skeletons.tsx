import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { fr } from "@/i18n/fr";
import { Skeleton } from "@/ui";
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

/** Cartes des demandes : pastilles, titre, lieu et délais, photo à droite. */
export function RequestCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <Loading>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.card, styles.row]}>
          <View style={styles.column}>
            <View style={styles.inline}>
              <Skeleton width={72} height={22} round />
              <Skeleton width={56} height={22} round />
            </View>
            <Skeleton width="85%" height={16} />
            <Skeleton width="55%" height={12} />
            <Skeleton width="40%" height={12} />
            <Skeleton width="60%" height={12} />
          </View>
          <Skeleton width={64} height={64} style={styles.thumb} />
        </View>
      ))}
    </Loading>
  );
}

/** Cartes des chantiers : étape, titre, client et lieu, montant. */
export function ChantierCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <Loading>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.card, styles.column]}>
          <Skeleton width={96} height={22} round />
          <Skeleton width="75%" height={16} />
          <Skeleton width="50%" height={12} />
          <View style={styles.between}>
            <Skeleton width="35%" height={12} />
            <Skeleton width={64} height={14} />
          </View>
        </View>
      ))}
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

/** Tableau de bord : chiffres clés, raccourcis, « À faire maintenant ». */
export function DashboardSkeleton() {
  return (
    <Loading gap={spacing(7)}>
      <View style={styles.kpis}>
        <Skeleton height={88} style={styles.kpi} />
        <Skeleton height={88} style={styles.kpi} />
        <Skeleton height={88} style={styles.kpiWide} />
      </View>
      <View style={styles.shortcuts}>
        {Array.from({ length: 4 }, (_, i) => (
          <View key={i} style={styles.shortcut}>
            <Skeleton width={52} height={52} round />
            <Skeleton width={56} height={10} />
          </View>
        ))}
      </View>
      <View style={styles.column}>
        <Skeleton width="45%" height={18} />
        <Skeleton height={64} style={styles.block} />
        <Skeleton height={64} style={styles.block} />
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
  kpis: { flexDirection: "row", flexWrap: "wrap", gap: spacing(3) },
  kpi: { flexGrow: 1, flexBasis: "40%", borderRadius: radius.card },
  kpiWide: { flexBasis: "100%", borderRadius: radius.card },
  shortcuts: { flexDirection: "row", justifyContent: "space-between" },
  shortcut: { alignItems: "center", gap: spacing(2) },
  block: { borderRadius: radius.card },
});
