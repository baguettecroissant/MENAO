import { router } from "expo-router";
import { FileText } from "lucide-react-native";
import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { documentInfo } from "@/components/chantier/dossier";
import { EmptyState } from "@/components/empty-state";
import { FicheTag, type FicheTone } from "@/components/pro/fiche-kit";
import { IconSquare } from "@/components/pro/tools-kit";
import { TabHeader } from "@/components/tab-header";
import { fr } from "@/i18n/fr";
import { loadMyDocuments, type ChantierDocument, type DocumentSection } from "@/lib/chantiers";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice, ScreenSkeleton, Tappable } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.clientDocuments;
const { colors, font, radius, spacing } = theme;
/** Pastille de chaque type de document, comme la maquette « DocumentsClientApp ». */
const KIND: Record<"devis" | "facture" | "pv", FicheTone> = {
  devis: "primary",
  facture: "success",
  pv: "neutral",
};

/**
 * « Mes documents » du client (onglet Documents des maquettes), comme sur le site : devis signés,
 * factures et PV, par chantier ; chacun s'ouvre en aperçu, puis se télécharge en PDF. Refonte
 * « Nette » (lot 11) : un groupe en carte par chantier, lignes avec carré d'icône et pastille.
 */
export function DocumentsScreen() {
  const [sections, reload] = useFocusData(loadMyDocuments);
  const [refreshing, setRefreshing] = useState(false);

  if (sections === undefined) return <ScreenSkeleton />;
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.primary}
            onRefresh={async () => {
              setRefreshing(true);
              await reload();
              setRefreshing(false);
            }}
          />
        }
      >
        <TabHeader title={t.title} subtitle={t.subtitle} />
        {sections === null ? <Notice tone="error">{t.error}</Notice> : null}
        {sections?.length === 0 ? (
          <EmptyState illustration="documents">{t.empty}</EmptyState>
        ) : null}
        {(sections ?? []).map((section) => (
          <DocumentGroup key={section.chantierId} section={section} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Documents d'un chantier : titre (Inter Tight), artisan et nombre, puis une ligne par document. */
function DocumentGroup({ section }: { section: DocumentSection }) {
  return (
    <View style={styles.group}>
      <View style={styles.groupHead}>
        <View style={styles.flex}>
          <Text role="heading" style={styles.groupTitle}>
            {section.title}
          </Text>
          {section.artisan ? <Text style={styles.meta}>{section.artisan}</Text> : null}
        </View>
        <Text style={styles.count}>{t.count(section.documents.length)}</Text>
      </View>
      {section.documents.map((d) => (
        <DocumentLine key={`${d.kind}-${d.id}`} document={d} />
      ))}
    </View>
  );
}

/** Un document : un appui ouvre son aperçu, d'où il se télécharge en PDF. */
function DocumentLine({ document: d }: { document: ChantierDocument }) {
  const { title, type, meta } = documentInfo(d);
  const kind = t.kinds[type];
  return (
    <Tappable
      role="link"
      aria-label={`${fr.documentPreview.open(title, meta)}, ${kind}`}
      onPress={() => router.push(`/document/${type}/${d.id}`)}
      style={styles.row}
    >
      <IconSquare icon={FileText} tone="neutral" size={38} />
      <View style={styles.flex}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.meta}>{meta}</Text>
      </View>
      <FicheTag text={kind} tone={KIND[type]} />
    </Tappable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing(5), gap: spacing(4), paddingBottom: spacing(10) },
  group: {
    overflow: "hidden",
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  groupHead: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing(3),
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: spacing(2),
  },
  groupTitle: {
    fontFamily: font.display,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.34,
    color: colors.foreground,
  },
  count: { fontFamily: font.semibold, fontSize: 13, color: colors["muted-foreground"] },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    paddingVertical: spacing(3),
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowTitle: { fontFamily: font.semibold, fontSize: 15, lineHeight: 20, color: colors.foreground },
  meta: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
});
