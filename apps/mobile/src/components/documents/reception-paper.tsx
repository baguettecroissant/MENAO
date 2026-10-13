import type { ReceptionDocumentModel } from "@menao/documents";
import { Check } from "lucide-react-native";
import { Image, StyleSheet, Text, View } from "react-native";
import { theme } from "@/ui/theme";

const { colors, font, radius, spacing } = theme;

/**
 * Le PV de réception tel qu'il sera signé, issu du même modèle que le PDF (`@menao/documents`),
 * mis en page pour le téléphone : case cochée selon le cas réel, réserves, récapitulatif financier.
 */
export function ReceptionPaper({
  model,
  logoUrl = null,
}: {
  model: ReceptionDocumentModel;
  /** Logo de l'entreprise (URL signée), s'il y en a un. */
  logoUrl?: string | null;
}) {
  const last = model.financial.length - 1;
  return (
    <View style={styles.paper}>
      <View style={styles.block}>
        <Text style={styles.title}>{model.title}</Text>
        <Text style={styles.text}>{model.numberLine}</Text>
        <Text style={styles.text}>{model.dateLine}</Text>
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

      <View style={styles.block}>
        <Text style={styles.strong}>{model.partiesTitle}</Text>
        {model.parties.map(([label, text]) => (
          <Text key={label} style={styles.text}>
            <Text style={styles.strong}>{label} :</Text> {text}
          </Text>
        ))}
      </View>

      <View style={styles.block}>
        <Text style={styles.strong}>{model.siteTitle}</Text>
        {model.siteLines.map((line, i) => (
          <Text key={i} style={styles.text}>
            {line}
          </Text>
        ))}
        {model.references.map((line) => (
          <Text key={line} style={styles.muted}>
            {line}
          </Text>
        ))}
      </View>

      <View style={styles.block}>
        <Text style={styles.strong}>{model.natureTitle}</Text>
        <Text style={styles.text}>{model.nature}</Text>
      </View>

      <View style={styles.block}>
        <Text style={styles.strong}>{model.receptionTitle}</Text>
        {model.choices.map((choice) => (
          <View
            key={choice.label}
            style={styles.choice}
            role="checkbox"
            aria-checked={choice.checked}
            aria-disabled
          >
            <View style={[styles.box, choice.checked && styles.boxChecked]}>
              {choice.checked ? (
                <Check size={11} color={colors["primary-foreground"]} strokeWidth={3} />
              ) : null}
            </View>
            <Text style={choice.checked ? styles.strong : styles.muted}>{choice.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.block}>
        <Text style={styles.strong}>{model.observationsTitle}</Text>
        {model.observations.map((line, i) => (
          <Text key={i} style={styles.text}>
            {line}
          </Text>
        ))}
      </View>

      <View style={styles.block}>
        <Text style={styles.strong}>{model.financialTitle}</Text>
        <View style={styles.table}>
          {model.financial.map(([label, value], i) => (
            <View key={label} style={[styles.tableRow, i === last && styles.tableRowLast]}>
              <Text style={[styles.cell, i === last && styles.cellLast]}>{label}</Text>
              <Text style={[styles.cellValue, i === last && styles.cellLast]}>{value}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={styles.muted}>{model.insuranceLine}</Text>
      <Text style={styles.text}>{model.placeLine}</Text>
      <View style={styles.signature}>
        <Text style={styles.strong}>{model.signatureLabel}</Text>
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
  block: { gap: 2 },
  title: { fontFamily: font.bold, fontSize: 16, color: colors.primary, marginBottom: 2 },
  logo: { width: 120, height: 40, marginBottom: spacing(1) },
  issuer: { ...text, fontFamily: font.bold, fontSize: 13 },
  text,
  strong: { ...text, fontFamily: font.medium },
  muted: { ...text, color: colors["muted-foreground"] },
  choice: { flexDirection: "row", alignItems: "center", gap: spacing(2), paddingVertical: 2 },
  box: {
    width: 15,
    height: 15,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors["border-strong"],
    alignItems: "center",
    justifyContent: "center",
  },
  boxChecked: { borderColor: colors.primary, backgroundColor: colors.primary },
  table: {
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
  },
  tableRowLast: { borderBottomWidth: 0, backgroundColor: colors.primary },
  cell: { ...text, flex: 1 },
  cellValue: { ...text, textAlign: "right" },
  cellLast: { fontFamily: font.medium, color: colors["primary-foreground"] },
  signature: {
    alignSelf: "flex-end",
    width: "70%",
    height: 72,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(2),
  },
});
