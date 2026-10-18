import { router, type Href } from "expo-router";
import { ChevronRight, FileText } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { formatLongDate } from "@/lib/dates";
import type { DocumentRow } from "@/lib/document-rows";
import { theme } from "@/ui/theme";

const t = fr.proDocuments;
const d = fr.proDossier;
const { colors, font, radius, spacing } = theme;

type Tone = "todo" | "pending" | "done" | "danger";
const toneColors: Record<Tone, { bg: string; fg: string }> = {
  todo: { bg: colors["primary-softer"], fg: colors["primary-strong"] },
  pending: { bg: colors["warning-soft"], fg: colors.warning },
  done: { bg: colors["success-soft"], fg: colors.success },
  danger: { bg: colors["danger-soft"], fg: colors.danger },
};

/** État affiché d'un document : pastille, ton et précision. */
function describe(
  row: DocumentRow,
  validated: boolean,
): { tone: Tone; status: string; hint: string } {
  if (row.exempt && !row.current)
    return { tone: "pending", status: t.states.exempt, hint: d.exemptHint };
  if (row.pending) return { tone: "pending", status: t.states.en_attente, hint: t.pending };
  if (row.refused)
    return { tone: "danger", status: t.states.refuse, hint: t.refused(row.refusedReason) };
  if (!row.current)
    return { tone: "todo", status: t.states.missing, hint: d.documentHints[row.type] };
  if (row.type === "kbis" && validated)
    return { tone: "done", status: t.states.valide, hint: t.kbisDone };
  const { expiry, days, dateFin } = row.current;
  if (expiry === "expire") return { tone: "danger", status: t.states.expire, hint: t.expired };
  if (expiry === "urgent" || expiry === "bientot") {
    return {
      tone: expiry === "urgent" ? "danger" : "pending",
      status: t.states[expiry],
      hint: t.expiresIn(days ?? 0),
    };
  }
  return {
    tone: "done",
    status: t.states.valide,
    hint: dateFin ? t.validUntil(formatLongDate(dateFin)) : d.documentHints[row.type],
  };
}

/** Liste des documents obligatoires, avec leur état et l'accès au dépôt. */
export function DocumentList({ rows, validated }: { rows: DocumentRow[]; validated: boolean }) {
  return (
    <View style={styles.list}>
      {rows.map((row) => {
        const { tone, status, hint } = describe(row, validated);
        return (
          <Row
            key={row.type}
            title={d.documents[row.type]}
            hint={hint}
            tone={tone}
            status={status}
            href={
              row.canUpload ? { pathname: "/pro-document", params: { type: row.type } } : undefined
            }
          />
        );
      })}
    </View>
  );
}

function Row({
  title,
  hint,
  tone,
  status,
  href,
}: {
  title: string;
  hint: string;
  tone: Tone;
  status: string;
  href?: Href;
}) {
  const chip = toneColors[tone];
  const content = (
    <>
      <View style={styles.icon}>
        <FileText size={20} color={colors["primary-strong"]} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowHint}>{hint}</Text>
      </View>
      <Text style={[styles.chip, { backgroundColor: chip.bg, color: chip.fg }]}>{status}</Text>
      {href ? <ChevronRight size={20} color={colors["muted-foreground"]} /> : null}
    </>
  );
  if (!href) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable
      role="link"
      aria-label={`${title}, ${status}`}
      onPress={() => router.push(href)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing(2.5) },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    padding: spacing(4),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.85 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.input,
    backgroundColor: colors["primary-soft"],
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: font.bold, fontSize: 15, color: colors.foreground },
  rowHint: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  chip: {
    fontFamily: font.bold,
    fontSize: 12,
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1),
    borderRadius: radius.pill,
    overflow: "hidden",
  },
});
