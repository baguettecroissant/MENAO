import type { JournalSummary } from "@menao/core";
import { FileText } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { fr } from "@/i18n/fr";
import type { ChantierDocument } from "@/lib/chantiers";
import { formatAgo, formatCents, formatDateNumeric } from "@/lib/format";
import { sharePdf } from "@/lib/pdf";
import { Body, Card, Notice } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.chantier;
const { colors, font, radius, spacing } = theme;

/**
 * Journal du chantier (F-22, F-12) : photos et messages de l'artisan, du plus récent au plus
 * ancien, communs aux vues du client et de l'artisan. `emptyText` : texte quand rien n'est publié ;
 * `children` : actions de l'artisan (message, photos).
 */
export function JournalCard({
  journal,
  photoUrls,
  emptyText,
  children,
}: {
  journal: JournalSummary;
  photoUrls: string[];
  emptyText: string | null;
  children?: ReactNode;
}) {
  const empty = journal.messages.length === 0 && photoUrls.length === 0;
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
              <Image
                key={uri}
                source={{ uri }}
                style={styles.photo}
                alt={`${t.journal.photosTitle} ${i + 1}`}
              />
            ))}
          </ScrollView>
        ) : null}
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

/** Documents du chantier (devis, factures, PV) : PDF produits pour le compte, puis partagés. */
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
function DocumentRow({ document: d }: { document: ChantierDocument }) {
  const [downloading, setDownloading] = useState(false);
  const [failed, setFailed] = useState(false);
  const title =
    d.kind === "devis"
      ? d.signed
        ? t.dossier.signedQuote
        : t.dossier.quote
      : d.kind === "pv"
        ? t.reception.pvDocument
        : t.dossier.invoice[d.kind];
  async function open() {
    setFailed(false);
    setDownloading(true);
    const ok = await sharePdf(
      d.kind === "devis"
        ? { quoteId: d.id }
        : d.kind === "pv"
          ? { receptionId: d.id }
          : { invoiceId: d.id },
      d.numero,
    );
    setDownloading(false);
    setFailed(!ok);
  }
  return (
    <View style={styles.documentItem}>
      <Pressable
        role="button"
        aria-label={`${title}, ${t.dossier.meta(d.numero, formatDateNumeric(d.date))}`}
        aria-busy={downloading}
        disabled={downloading}
        style={styles.document}
        onPress={open}
      >
        <View style={styles.docIcon}>
          {downloading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <FileText size={20} color={colors.primary} />
          )}
        </View>
        <View style={styles.flex}>
          <Text style={styles.docTitle}>{title}</Text>
          <Text style={styles.meta}>{t.dossier.meta(d.numero, formatDateNumeric(d.date))}</Text>
        </View>
      </Pressable>
      {failed ? <Notice tone="error">{fr.pdf.failed}</Notice> : null}
    </View>
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
  documentItem: { gap: spacing(2) },
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
