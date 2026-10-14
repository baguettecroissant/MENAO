import type { JournalSummary } from "@menao/core";
import { router } from "expo-router";
import { ChevronRight, FileText } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { PhotoViewer } from "@/components/photo-viewer";
import { fr } from "@/i18n/fr";
import type { ChantierDocument } from "@/lib/chantiers";
import { formatAgo, formatCents, formatDateNumeric } from "@/lib/format";
import { Body, Card } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.chantier;
const { colors, font, radius, spacing } = theme;

/**
 * Journal du chantier (F-22, F-12) : photos (ouvertes en grand d'un appui) et messages de
 * l'artisan, du plus récent au plus ancien, communs aux vues du client et de l'artisan.
 * `emptyText` : texte quand rien n'est publié ; `photoAction` et `children` : actions de
 * l'artisan (photos, message).
 */
export function JournalCard({
  journal,
  photoUrls,
  emptyText,
  photoAction,
  children,
}: {
  journal: JournalSummary;
  photoUrls: string[];
  emptyText: string | null;
  /** « Ajouter une photo » (artisan, pendant les travaux), sous les photos comme sur le site. */
  photoAction?: ReactNode;
  children?: ReactNode;
}) {
  const empty = journal.messages.length === 0 && photoUrls.length === 0;
  const [viewing, setViewing] = useState<number | null>(null);
  return (
    <Card>
      <View style={styles.card}>
        <Text role="heading" style={styles.heading}>
          {t.journal.title}
        </Text>
        {journal.lastUpdateAt ? (
          <Text style={styles.meta}>{t.journal.lastUpdate(formatAgo(journal.lastUpdateAt))}</Text>
        ) : null}
        {empty && emptyText ? <Body muted>{emptyText}</Body> : null}
        {photoUrls.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photos}
          >
            {photoUrls.map((uri, i) => (
              <Pressable
                key={uri}
                role="button"
                aria-label={fr.photoViewer.open(i + 1, photoUrls.length)}
                onPress={() => setViewing(i)}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Image
                  source={{ uri }}
                  style={styles.photo}
                  alt={`${t.journal.photosTitle} ${i + 1}`}
                />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
        <PhotoViewer photos={photoUrls} index={viewing} onClose={() => setViewing(null)} />
        {photoAction}
        {journal.messages.map((m) => (
          <View key={m.id} style={styles.message}>
            <Text style={styles.messageText}>{m.message}</Text>
            <Text style={styles.small}>{t.journal.messageLeft(formatAgo(m.createdAt))}</Text>
          </View>
        ))}
        {children}
      </View>
    </Card>
  );
}

function Line({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View style={styles.line}>
      <Text style={[styles.meta, strong && styles.lineStrong]}>{label}</Text>
      <Text style={[styles.lineValue, strong && styles.lineStrong]}>{value}</Text>
    </View>
  );
}

/** Échéancier du devis signé, toujours recalculé à partir des paiements (CLAUDE.md règle 5). */
export function ScheduleCard({
  progress,
  totalTtcCents,
}: {
  progress: { paidCents: number; remainingCents: number } | null;
  totalTtcCents: number | null;
}) {
  return (
    <Card>
      <View style={styles.card}>
        <Text role="heading" style={styles.heading}>
          {t.dossier.schedule}
        </Text>
        {progress && totalTtcCents !== null ? (
          <>
            <Line label={t.dossier.total} value={formatCents(totalTtcCents)} />
            <Line label={t.dossier.paid} value={formatCents(progress.paidCents)} />
            <Line label={t.dossier.remaining} value={formatCents(progress.remainingCents)} strong />
          </>
        ) : (
          <Body muted>{t.dossier.noSchedule}</Body>
        )}
      </View>
    </Card>
  );
}

/** Documents du chantier (devis, factures, PV) : aperçu, puis PDF à télécharger ou partager. */
export function DocumentsCard({ documents }: { documents: ChantierDocument[] }) {
  return (
    <Card>
      <View style={styles.card}>
        <Text role="heading" style={styles.heading}>
          {t.dossier.documents}
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

/** Document du dossier : PDF produit pour le compte, puis proposé au partage du téléphone. */
/** Document du chantier : un appui ouvre son aperçu, d'où il se télécharge en PDF. */
function DocumentRow({ document: d }: { document: ChantierDocument }) {
  const title =
    d.kind === "devis"
      ? d.signed
        ? t.dossier.signedQuote
        : t.dossier.quote
      : d.kind === "pv"
        ? t.reception.pvDocument
        : t.dossier.invoice[d.kind];
  const type = d.kind === "devis" || d.kind === "pv" ? d.kind : "facture";
  const meta = t.dossier.meta(d.numero, formatDateNumeric(d.date));
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
  photos: { gap: spacing(3) },
  photo: {
    width: 150,
    height: 112,
    borderRadius: radius.input,
    backgroundColor: colors["primary-soft"],
  },
  pressed: { opacity: 0.85 },
  message: {
    gap: spacing(1),
    borderRadius: radius.input,
    backgroundColor: colors.background,
    padding: spacing(3),
  },
  messageText: { fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: colors.foreground },
  small: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
  line: { flexDirection: "row", justifyContent: "space-between", gap: spacing(3) },
  lineValue: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  lineStrong: { fontFamily: font.bold, color: colors.foreground },
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
