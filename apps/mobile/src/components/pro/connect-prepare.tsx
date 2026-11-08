import type { ConnectDetails, ConnectTokenPrefill } from "@menao/core";
import { connectDetailsSchema } from "@menao/validation";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { Button } from "@/ui";
import { theme } from "@/ui/theme";
import { CardHeading, FicheButton, FicheCard } from "./fiche-kit";
import { CheckRow, FieldPair, SwitchCard, ToolField } from "./tools-kit";

const t = fr.proPayments.prepare;
const { colors, font, spacing } = theme;

/**
 * Premier passage à l'écran Paiements (ADR 0215), comme sur le site : l'artisan saisit dans MENAO
 * ce que Stripe demanderait encore (date de naissance, adresse personnelle, IBAN, associé unique).
 * Ces données partent directement chez Stripe dans des jetons créés par l'application. Sans clé
 * publique, un simple bouton. Refonte « Nette » (lot 9) : carte, champs arrondis en 16 points,
 * case bleu nuit et interrupteur en carte.
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
  const [website, setWebsite] = useState("");
  const [soleOwner, setSoleOwner] = useState(prefill?.soleOwnerDefault === true);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});

  if (!prefill) {
    return (
      <FicheButton
        label={fr.proPayments.start}
        tall
        onPress={() => onContinue(null)}
        loading={busy}
      />
    );
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
      website,
    });
    if (!parsed.success) {
      setErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }
    setErrors({});
    onContinue(parsed.data);
  }

  return (
    <FicheCard padding={4.5} gap={3.5}>
      <View style={styles.head}>
        <CardHeading title={t.title} size={18} />
        <Text style={styles.intro}>{t.intro}</Text>
      </View>
      {personal ? (
        <>
          <ToolField
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
              <CheckRow label={t.sameAddress} checked={sameAddress} onChange={setSameAddress} />
            ) : null}
            {sameAddress && businessAddress ? null : (
              <>
                <ToolField
                  label={t.line1}
                  value={line1}
                  onChangeText={setLine1}
                  autoComplete="address-line1"
                  textContentType="streetAddressLine1"
                  error={error("line1")}
                />
                <FieldPair>
                  <ToolField
                    label={t.postalCode}
                    value={postalCode}
                    onChangeText={setPostalCode}
                    keyboardType="number-pad"
                    autoComplete="postal-code"
                    textContentType="postalCode"
                    maxLength={5}
                    error={error("postalCode")}
                    style={styles.postal}
                  />
                  <ToolField
                    label={t.city}
                    value={city}
                    onChangeText={setCity}
                    autoComplete="address-line2"
                    textContentType="addressCity"
                    error={error("city")}
                    style={styles.city}
                  />
                </FieldPair>
              </>
            )}
          </View>
        </>
      ) : null}
      {askSoleOwner ? (
        <SwitchCard
          label={t.soleOwner}
          hint={t.soleOwnerHint}
          value={soleOwner}
          onChange={setSoleOwner}
          soft
        />
      ) : null}
      <ToolField
        label={t.iban}
        hint={t.ibanHint}
        value={iban}
        onChangeText={setIban}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        error={error("iban")}
      />
      <ToolField
        label={t.website}
        hint={t.websiteHint}
        value={website}
        onChangeText={setWebsite}
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="url"
        textContentType="URL"
        error={error("website")}
      />
      <FicheButton label={t.submit} tall onPress={submit} loading={busy} />
      <Button label={t.skip} variant="ghost" onPress={() => onContinue(null)} disabled={busy} />
    </FicheCard>
  );
}

const styles = StyleSheet.create({
  head: { gap: spacing(1.5) },
  intro: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.label },
  group: { gap: spacing(2.5) },
  legend: { fontFamily: font.semibold, fontSize: 14, color: colors.foreground },
  postal: { flex: 2 },
  city: { flex: 3 },
});
