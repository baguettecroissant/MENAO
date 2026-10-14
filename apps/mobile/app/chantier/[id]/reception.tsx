import { RESERVES_LIMITS, SIGNATURE_CONSENTS, type SignatureConsent } from "@menao/core";
import { receptionDocumentModel } from "@menao/documents";
import { receptionConsentsSchema, reservesSchema } from "@menao/validation";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { MapPin } from "lucide-react-native";
import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { ConsentList, type ConsentItem } from "@/components/consents";
import { ReceptionPaper } from "@/components/documents/reception-paper";
import { HeaderBand } from "@/components/header-band";
import { StepTabs } from "@/components/step-tabs";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { providerLinks, siteLinks } from "@/lib/env";
import { formatCents } from "@/lib/format";
import { openHostedPage } from "@/lib/hosted";
import { loadReception, startReceptionSignature } from "@/lib/reception";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Button, Card, Notice, Screen, Section, TextField } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.reception;
const links = fr.quote.signature.links;
const { colors, font, radius, spacing } = theme;

/**
 * Réception des travaux (F-25, F-26), comme sur le site : réserves éventuelles (`reserves=1`),
 * aperçu du PV tel qu'il sera signé, cases à cocher, puis signature chez DocuSeal dans la fenêtre
 * sécurisée. Le PV signé fait foi : ses données sont figées par la base à l'ouverture de la
 * signature.
 */
export default function ReceptionScreen() {
  const { id, reserves: reservesParam } = useLocalSearchParams<{
    id: string;
    reserves?: string;
  }>();
  const withReserves = reservesParam === "1";
  const load = useCallback(() => loadReception(id), [id]);
  const [reception] = useFocusData(load);
  const [step, setStep] = useState<"reserves" | "pv">(withReserves ? "reserves" : "pv");
  const [reserves, setReserves] = useState("");
  const [reservesError, setReservesError] = useState<string | undefined>(undefined);
  const [checked, setChecked] = useState<Partial<Record<SignatureConsent, boolean>>>({});
  const [errors, setErrors] = useState<Partial<Record<SignatureConsent, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (reception === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (reception === null) {
    return (
      <Screen header={<TopBar />}>
        <Notice tone="error">{fr.chantier.notFound}</Notice>
      </Screen>
    );
  }
  // Chantier pas (ou plus) en attente de réception : retour au chantier.
  if (!reception.ready) return <Redirect href={`/chantier/${id}`} />;

  const balance = formatCents(reception.balanceCents);
  const steps = [
    ...(withReserves ? [{ key: "reserves" as const, label: t.steps.reserves }] : []),
    { key: "pv" as const, label: t.steps.pv },
    { key: "solde" as const, label: t.steps.solde },
  ];
  const model = {
    ...receptionDocumentModel({
      ...reception.preview,
      withReserves,
      reserves: withReserves ? reserves : null,
    }),
    numberLine: t.numberPending,
  };
  const items: ConsentItem[] = [
    { name: "document", label: t.consents.document, links: [] },
    {
      name: "cgu_prestataire",
      label: t.consents.cgu_prestataire,
      links: [{ label: links.provider, url: providerLinks.docusealTerms }],
    },
    {
      name: "cgu_menao",
      label: t.consents.cgu_menao,
      links: [
        { label: links.terms, url: siteLinks.terms },
        { label: links.privacy, url: siteLinks.privacy },
      ],
    },
    { name: "echeancier", label: t.consents.echeancier(balance), links: [] },
  ];

  /** Réserves contrôlées comme sur le site (10 caractères au moins). */
  function checkReserves(): string | null {
    const parsed = reservesSchema.safeParse({ reserves });
    if (parsed.success) {
      setReservesError(undefined);
      return parsed.data.reserves;
    }
    setReservesError(z.flattenError(parsed.error).fieldErrors.reserves?.[0]);
    return null;
  }

  async function submit() {
    const accepted = withReserves ? checkReserves() : null;
    if (withReserves && accepted === null) return setStep("reserves");
    const consents = receptionConsentsSchema.safeParse(
      Object.fromEntries(SIGNATURE_CONSENTS.map((c) => [c, checked[c] === true])),
    );
    if (!consents.success) {
      const fields = z.flattenError(consents.error).fieldErrors;
      setErrors(Object.fromEntries(SIGNATURE_CONSENTS.map((c) => [c, fields[c]?.[0]])));
      return;
    }
    setErrors({});
    setFailure(null);
    setPending(true);
    const opened = await startReceptionSignature(id, accepted, consents.data);
    if ("error" in opened) {
      setPending(false);
      setFailure(opened.error);
      return;
    }
    const result = await openHostedPage(opened.url);
    setPending(false);
    if (result === "reception") {
      router.dismissTo({ pathname: "/chantier/[id]", params: { id, retour: "reception" } });
    }
  }

  const address = reception.preview.site.addressLines.join(", ");
  const band = (
    <HeaderBand title={reception.title} meta={address ? [{ icon: MapPin, text: address }] : []}>
      <StepTabs steps={steps} current={step} />
    </HeaderBand>
  );

  if (step === "reserves") {
    return (
      <Screen
        band={band}
        footer={
          <Button label={t.continue} onPress={() => checkReserves() !== null && setStep("pv")} />
        }
      >
        <Section title={t.reservesTitle}>
          <Text style={styles.strong}>{t.reservesQuestion}</Text>
          <Body muted>{t.reservesHelp(reception.artisanName)}</Body>
          <TextField
            label={t.reservesLabel}
            value={reserves}
            onChangeText={(value) => {
              setReserves(value);
              setReservesError(undefined);
            }}
            placeholder={t.reservesPlaceholder}
            maxLength={RESERVES_LIMITS.max}
            multiline
            error={reservesError}
          />
        </Section>
      </Screen>
    );
  }

  return (
    <Screen band={band} footer={<Button label={t.submit} onPress={submit} loading={pending} />}>
      {withReserves ? null : (
        <Card tone="soft">
          <View style={styles.conform}>
            <Text role="heading" style={styles.strong}>
              {t.conformTitle}
            </Text>
            <Body muted>{t.conformText(reception.artisanName)}</Body>
            <Text style={styles.important}>
              <Text style={styles.importantLabel}>{t.important}</Text> {t.conformNext(balance)}
            </Text>
          </View>
        </Card>
      )}
      <Section title={t.pvTitle} text={t.pvIntro}>
        <ReceptionPaper model={model} logoUrl={reception.logoUrl} />
      </Section>
      {withReserves ? (
        <Button label={t.editReserves} variant="secondary" onPress={() => setStep("reserves")} />
      ) : null}
      <ConsentList
        items={items}
        checked={checked}
        onChange={(name, value) => {
          setChecked((prev) => ({ ...prev, [name]: value }));
          setErrors((prev) => ({ ...prev, [name]: undefined }));
        }}
        errors={errors}
      />
      {failure ? <Notice tone="error">{failure}</Notice> : null}
      <Body muted>{t.otp}</Body>
      <Body muted center>
        {t.balanceNext}
      </Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  strong: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  conform: { gap: spacing(2) },
  important: {
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors["primary-strong"],
    borderRadius: radius.input,
    backgroundColor: colors["primary-softer"],
    padding: spacing(3),
    overflow: "hidden",
  },
  importantLabel: { fontFamily: font.medium },
});
