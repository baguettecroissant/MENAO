import { router } from "expo-router";
import { ChevronRight, FileText } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import type { ChantierDocument } from "@/lib/chantiers";
import { formatDateNumeric } from "@/lib/format";
import { Body, Card } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.chantier;
const { colors, font, radius, spacing } = theme;

/** Documents du chantier (devis, factures, PV) : aperçu, puis PDF à télécharger ou partager. */
export function DocumentsCard({
  documents,
  title = t.dossier.documents,
}: {
  documents: ChantierDocument[];
  /** Titre de la carte : « Documents liés », ou le chantier dans « Mes documents ». */
  title?: string;
}) {
  return (
    <Card>
      <View style={styles.card}>
        <Text role="heading" style={styles.heading}>
          {title}
        </Text>
        {documents.length === 0 ? (
          <Body muted>{t.dossier.noDocuments}</Body>
        ) : (
          documents.map((d) => <DocumentRow key={`${d.kind}-${d.id}`} document={d} />)
        )}
      </View>
    </Card>
  );
}

/**
 * Titre, type d'aperçu (`/document/<type>/<id>`) et ligne « numéro · date » d'un document du
 * chantier, partagés avec « Mes documents ».
 */
export function documentInfo(d: ChantierDocument) {
  const title =
    d.kind === "devis"
      ? d.signed
        ? t.dossier.signedQuote
        : t.dossier.quote
      : d.kind === "pv"
        ? t.reception.pvDocument
        : t.dossier.invoice[d.kind];
  const type: "devis" | "pv" | "facture" =
    d.kind === "devis" || d.kind === "pv" ? d.kind : "facture";
  const meta = t.dossier.meta(d.numero, formatDateNumeric(d.date));
  return { title, type, meta };
}

/** Document du chantier : un appui ouvre son aperçu, d'où il se télécharge en PDF. */
function DocumentRow({ document: d }: { document: ChantierDocument }) {
  const { title, type, meta } = documentInfo(d);
  return (
    <Pressable
      role="link"
      aria-label={fr.documentPreview.open(title, meta)}
      style={({ pressed }) => [styles.document, pressed && styles.pressed]}
      onPress={() => router.push(`/document/${type}/${d.id}`)}
    >
      <View style={styles.docIcon}>
        <FileText size={20} color={colors.primary} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.docTitle}>{title}</Text>
        <Text style={styles.meta}>{meta}</Text>
      </View>
      <ChevronRight size={18} color={colors["muted-foreground"]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing(3) },
  heading: { fontFamily: font.medium, fontSize: 17, color: colors.foreground },
  meta: {
    flexShrink: 1,
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors["muted-foreground"],
  },
  pressed: { opacity: 0.85 },
  document: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(3),
  },
  docIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors["primary-soft"],
    alignItems: "center",
    justifyContent: "center",
  },
  docTitle: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  flex: { flex: 1, gap: 2 },
});
