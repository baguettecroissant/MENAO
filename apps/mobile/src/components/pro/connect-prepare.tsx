import type { ConnectDetails, ConnectTokenPrefill } from "@menao/core";
import { connectDetailsSchema } from "@menao/validation";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { Body, Button, Checkbox, TextField } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proPayments.prepare;
const { colors, font, spacing } = theme;

/**
 * Premier passage à l'écran Paiements (ADR 0215), comme sur le site : l'artisan saisit dans MENAO
 * ce que Stripe demanderait encore (date de naissance, adresse personnelle, IBAN, associé unique).
 * Ces données partent directement chez Stripe dans des jetons créés par l'application. Sans clé
 * publique, un simple bouton.
 */
export function ConnectPrepare({
  prefill,
  today,
  busy,
  onContinue,
}: {
  prefill: ConnectTokenPrefill | null;
  /** Date du jour (AAAA-MM-JJ, heure de Paris). */
  today: string;
  busy: boolean;
  /** Compléments validés, ou null pour tout remplir chez Stripe. */
  onContinue: (details: ConnectDetails | null) => void;
}) {
  const [birthDate, setBirthDate] = useState("");
  const [sameAddress, setSameAddress] = useState(false);
  const [line1, setLine1] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [iban, setIban] = useState("");
  const [soleOwner, setSoleOwner] = useState(prefill?.soleOwnerDefault === true);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});

  if (!prefill) {
    return <Button label={fr.proPayments.start} onPress={() => onContinue(null)} loading={busy} />;
  }

  const personal = prefill.person != null || prefill.account?.business_type === "individual";
  const businessAddress = prefill.businessAddress ?? null;
  const askSoleOwner = prefill.person != null && prefill.soleOwnerDefault != null;
  const error = (field: string) => errors[field]?.[0];

  function submit() {
    const parsed = connectDetailsSchema({ personal, today, businessAddress }).safeParse({
      birthDate,
      sameAddress,
      line1,
      postalCode,
      city,
      iban,
      soleOwner,
    });
    if (!parsed.success) {
      setErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }
    setErrors({});
    onContinue(parsed.data);
  }

  return (
    <View style={styles.form}>
      <View style={styles.head}>
        <Text style={styles.title}>{t.title}</Text>
        <Body muted>{t.intro}</Body>
      </View>
      {personal ? (
        <>
          <TextField
            label={t.birthDate}
            placeholder={t.birthDatePlaceholder}
            value={birthDate}
            onChangeText={setBirthDate}
            keyboardType="numbers-and-punctuation"
            autoComplete="birthdate-full"
            textContentType="birthdate"
            maxLength={10}
            error={error("birthDate")}
          />
          <View style={styles.group}>
            <Text style={styles.legend}>{t.homeAddress}</Text>
            {businessAddress ? (
              <Checkbox label={t.sameAddress} checked={sameAddress} onChange={setSameAddress} />
            ) : null}
            {sameAddress && businessAddress ? null : (
              <>
                <TextField
                  label={t.line1}
                  value={line1}
                  onChangeText={setLine1}
                  autoComplete="address-line1"
                  textContentType="streetAddressLine1"
                  error={error("line1")}
                />
                <TextField
                  label={t.postalCode}
                  value={postalCode}
                  onChangeText={setPostalCode}
                  keyboardType="number-pad"
                  autoComplete="postal-code"
                  textContentType="postalCode"
                  maxLength={5}
                  error={error("postalCode")}
                />
                <TextField
                  label={t.city}
                  value={city}
                  onChangeText={setCity}
                  autoComplete="address-line2"
                  textContentType="addressCity"
                  error={error("city")}
                />
              </>
            )}
          </View>
        </>
      ) : null}
      {askSoleOwner ? (
        <View>
          <Checkbox label={t.soleOwner} checked={soleOwner} onChange={setSoleOwner} />
          <Body muted>{t.soleOwnerHint}</Body>
        </View>
      ) : null}
      <TextField
        label={t.iban}
        hint={t.ibanHint}
        value={iban}
        onChangeText={setIban}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        error={error("iban")}
      />
      <Button label={t.submit} onPress={submit} loading={busy} />
      <Button label={t.skip} variant="ghost" onPress={() => onContinue(null)} disabled={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing(3) },
  head: { gap: spacing(1) },
  title: { fontFamily: font.bold, fontSize: 16, color: colors.foreground },
  group: { gap: spacing(2) },
  legend: { fontFamily: font.medium, fontSize: 14, color: colors.foreground },
});
