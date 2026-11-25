import { FlaskConical } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { fillTestDossier } from "@/lib/artisan-dossier";
import { Notice } from "@/ui";
import { theme } from "@/ui/theme";
import { FicheButton } from "./fiche-kit";

const t = fr.proDossier.essai;
const { colors, font, spacing, radius } = theme;

/** Compte d'essai (lot 82, ADR 0392), comme sur le site : tout remplir d'un coup. */
export function TestBanner({ onFilled }: { onFilled: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <View style={styles.banner}>
      <View style={styles.head}>
        <View style={styles.icon}>
          <FlaskConical size={17} color={colors.surface} />
        </View>
        <View style={styles.texts}>
          <Text style={styles.title}>{t.title}</Text>
          <Text style={styles.text}>{t.text}</Text>
        </View>
      </View>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <FicheButton
        label={t.fillAll}
        variant="dark"
        loading={pending}
        onPress={async () => {
          setPending(true);
          const failure = await fillTestDossier();
          setPending(false);
          setError(failure);
          if (!failure) onFilled();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    gap: spacing(3),
    padding: spacing(4),
    borderRadius: radius.card,
    backgroundColor: colors["violet-soft"],
  },
  head: { flexDirection: "row", alignItems: "flex-start", gap: spacing(2.5) },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.violet,
  },
  texts: { flex: 1, gap: 2 },
  title: { fontFamily: font.bold, fontSize: 15, color: colors.violet },
  text: { fontFamily: font.regular, fontSize: 13.5, lineHeight: 19, color: colors.violet },
});
