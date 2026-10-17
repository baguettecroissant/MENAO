import { Mail } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { fr } from "@/i18n/fr";
import { resendArtisanCode, verifyArtisanCode } from "@/lib/artisan-signup";
import { Button, LinkText, Notice } from "@/ui";
import { theme } from "@/ui/theme";
import { StepTitle } from "./signup-parts";

const t = fr.proSignup.code;
const { colors, font, radius, spacing } = theme;

/** Code à 6 chiffres reçu par e-mail : confirme l'adresse sans quitter l'application. */
export function CodeStep({
  email,
  onVerified,
  onChangeEmail,
}: {
  email: string;
  onVerified: () => void;
  onChangeEmail: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setError(null);
    const failure = await verifyArtisanCode(email, code);
    setPending(false);
    if (failure) return setError(failure);
    onVerified();
  }

  return (
    <>
      <View style={styles.icon}>
        <Mail size={28} color={colors["primary-strong"]} />
      </View>
      <StepTitle title={t.title} lead={t.lead(email)} />
      <TextInput
        aria-label={t.label}
        value={code}
        onChangeText={(text) => setCode(text.replace(/\D/g, "").slice(0, 6))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="000000"
        placeholderTextColor={colors["subtle-foreground"]}
        style={[styles.code, error ? styles.codeError : null]}
      />
      {error ? <Notice tone="error">{error}</Notice> : null}
      {resent ? <Notice tone="success">{t.resent}</Notice> : null}
      <Button label={t.submit} onPress={submit} loading={pending} disabled={code.length !== 6} />
      <View style={styles.links}>
        <LinkText
          label={t.resend}
          onPress={async () => {
            const failure = await resendArtisanCode(email);
            setError(failure);
            setResent(!failure);
          }}
        />
        <LinkText label={t.changeEmail} onPress={onChangeEmail} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 56,
    height: 56,
    borderRadius: radius.card,
    backgroundColor: colors["primary-soft"],
    alignItems: "center",
    justifyContent: "center",
  },
  code: {
    minHeight: 64,
    borderRadius: radius.input,
    borderWidth: 1.5,
    borderColor: colors["border-strong"],
    backgroundColor: colors.surface,
    textAlign: "center",
    fontFamily: font.bold,
    fontSize: 28,
    letterSpacing: 12,
    color: colors.foreground,
  },
  codeError: { borderColor: colors.danger },
  links: { flexDirection: "row", flexWrap: "wrap", gap: spacing(6) },
});
