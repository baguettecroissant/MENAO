import { INVOICE_TEXTS, QUOTE_TEXTS, type InvoiceDocumentModel } from "@menao/documents";
import { Image, StyleSheet, Text, View } from "react-native";
import { theme } from "@/ui/theme";

const { colors, font, radius, spacing } = theme;

/**
 * La facture telle qu'elle a été émise, issue du même modèle que le PDF (`@menao/documents`),
 * mise en page pour le téléphone comme le devis : lignes, totaux, paiement et mentions.
 */
export function InvoicePaper({
  model,
  logoUrl = null,
}: {
  model: InvoiceDocumentModel;
  /** Logo de l'entreprise (URL signée), s'il y en a un. */
  logoUrl?: string | null;
}) {
  const last = model.totals.length - 1;
  return (
    <View style={styles.paper}>
      <View style={styles.block}>
        <Text style={styles.title}>{model.title}</Text>
        <Text style={styles.text}>{model.numberLine}</Text>
        <Text style={styles.text}>{model.dateLine}</Text>
        {model.quoteLine ? <Text style={styles.muted}>{model.quoteLine}</Text> : null}
      </View>

      <View style={styles.block}>
        {logoUrl ? (
          <Image
            source={{ uri: logoUrl }}
            style={styles.logo}
            resizeMode="contain"
            accessible={false}
          />
        ) : null}
        <Text style={styles.issuer}>{model.issuerName}</Text>
        {model.issuerLines.map((line, i) => (
          <Text key={i} style={styles.muted}>
            {line}
          </Text>
        ))}
      </View>

      <View style={styles.parties}>
        <View style={styles.party}>
          <Text style={styles.label}>{QUOTE_TEXTS.client}</Text>
          {model.clientLines.map((line, i) => (
            <Text key={i} style={i === 0 ? styles.strong : styles.text}>
              {line}
            </Text>
          ))}
        </View>
        <View style={styles.party}>
          <Text style={styles.label}>{QUOTE_TEXTS.site}</Text>
          {model.siteLines.map((line, i) => (
            <Text key={i} style={styles.text}>
              {line}
            </Text>
          ))}
        </View>
      </View>

      <View style={styles.block}>
        <Text style={styles.strong}>{model.subjectLine}</Text>
        <Text style={styles.muted}>{model.insuranceLine}</Text>
      </View>

      <View>
        <View style={styles.rowsHeader}>
          <Text style={styles.label}>{INVOICE_TEXTS.columns.designation}</Text>
          <Text style={styles.label}>{INVOICE_TEXTS.columns.total}</Text>
        </View>
        {model.rows.map((row, i) => (
          <View key={i} style={styles.row}>
            <Text style={[styles.text, styles.rowMain]}>{row.designation}</Text>
            <Text style={styles.amount}>{row.total}</Text>
          </View>
        ))}
      </View>

      <View style={styles.totals}>
        {model.totals.map(([name, value], i) => (
          <View key={`${name}-${i}`} style={[styles.total, i === last && styles.totalLast]}>
            <Text style={[i === last ? styles.strong : styles.text, styles.totalName]}>{name}</Text>
            <Text style={[styles.amount, i === last && styles.strong]}>{value}</Text>
          </View>
        ))}
      </View>

      {model.paymentLine ? <Text style={styles.strong}>{model.paymentLine}</Text> : null}

      <View style={styles.block}>
        {model.mentions.map((mention, i) => (
          <Text key={i} style={styles.muted}>
            {mention}
          </Text>
        ))}
        <Text style={styles.muted}>{model.footer}</Text>
      </View>
    </View>
  );
}

const text = { fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: colors.foreground };

const styles = StyleSheet.create({
  paper: {
    gap: spacing(3.5),
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing(4),
  },
  title: { fontFamily: font.bold, fontSize: 18, color: colors.primary, marginBottom: 2 },
  block: { gap: 1 },
  logo: { width: 120, height: 40, marginBottom: spacing(1) },
  issuer: { ...text, fontFamily: font.bold, fontSize: 13 },
  text,
  strong: { ...text, fontFamily: font.medium },
  muted: { ...text, color: colors["muted-foreground"] },
  label: { ...text, fontFamily: font.medium, color: colors["muted-foreground"] },
  parties: {
    flexDirection: "row",
    gap: spacing(3),
    borderRadius: radius.chip,
    backgroundColor: colors["primary-softer"],
    padding: spacing(3),
  },
  party: { flex: 1, gap: 1 },
  rowsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderRadius: radius.chip,
    backgroundColor: colors["primary-softer"],
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(2),
  },
  rowMain: { flex: 1 },
  amount: { ...text, textAlign: "right" },
  totals: { alignSelf: "flex-end", width: "85%", gap: 2 },
  total: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing(3),
    paddingHorizontal: spacing(2),
  },
  totalName: { flexShrink: 1 },
  totalLast: {
    borderRadius: radius.chip,
    backgroundColor: colors["primary-softer"],
    paddingVertical: spacing(1),
  },
});
