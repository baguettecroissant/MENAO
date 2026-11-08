import { RESERVES_LIMITS, SIGNATURE_CONSENTS, type SignatureConsent } from "@menao/core";
import { receptionDocumentModel } from "@menao/documents";
import { receptionConsentsSchema, reservesSchema } from "@menao/validation";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Info, PenLine } from "lucide-react-native";
import { useCallback, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { z } from "zod";
import { ConsentList, type ConsentItem } from "@/components/consents";
import { ReceptionPaper } from "@/components/documents/reception-paper";
import {
  ActionScreen,
  ActionSubmit,
  JourneySteps,
  SectionLabel,
} from "@/components/pro/action-kit";
import { SoftBanner } from "@/components/pro/dossier-kit";
import { FicheButton, FicheCard, FicheScreen, FicheSkeleton } from "@/components/pro/fiche-kit";
import { ToolField } from "@/components/pro/tools-kit";
import { fr } from "@/i18n/fr";
import { providerLinks, siteLinks } from "@/lib/env";
import { formatCents } from "@/lib/format";
import { openHostedPage } from "@/lib/hosted";
import { loadReception, startReceptionSignature } from "@/lib/reception";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.reception;
const links = fr.quote.signature.links;
const { colors, font } = theme;

/**
 * Réception des travaux (F-25, F-26), comme sur le site : réserves éventuelles (`reserves=1`),
 * aperçu du PV tel qu'il sera signé, cases à cocher, puis signature chez DocuSeal dans la fenêtre
 * sécurisée. Le PV signé fait foi : ses données sont figées par la base à l'ouverture de la
 * signature. Écran « Nette » (lot 11) : barre d'étapes (réserves, PV, solde, avis), réserves dans
 * une carte, PV et cases bleu nuit, bouton collé en bas.
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

  if (reception === undefined) return <FicheSkeleton title={t.title} />;
  if (reception === null) {
    return (
      <FicheScreen title={t.title}>
        <Notice tone="error">{fr.chantier.notFound}</Notice>
      </FicheScreen>
    );
  }
  // Chantier pas (ou plus) en attente de réception : retour au chantier.
  if (!reception.ready) return <Redirect href={`/chantier/${id}`} />;

  const balance = formatCents(reception.balanceCents);
  // Fin de chantier (F-27) : réserves éventuelles, PV, solde, puis avis.
  const steps = [
    ...(withReserves ? [t.steps.reserves] : []),
    t.steps.pv,
    t.steps.solde,
    fr.clientReview.steps.avis,
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
  const meta = [reception.title, address].filter(Boolean).join(" · ");
  const journey = (
    <JourneySteps
      label={t.stepsLabel}
      steps={steps}
      current={step === "reserves" || !withReserves ? 0 : 1}
    />
  );

  if (step === "reserves") {
    return (
      <ActionScreen
        bar={t.title}
        steps={journey}
        title={t.reservesTitle}
        lead={t.reservesQuestion}
        meta={meta}
        footer={
          <ActionSubmit
            label={t.continue}
            onPress={() => checkReserves() !== null && setStep("pv")}
          />
        }
      >
        <FicheCard padding={4} gap={3}>
          <Text style={styles.text}>{t.reservesHelp(reception.artisanName)}</Text>
          <ToolField
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
        </FicheCard>
      </ActionScreen>
    );
  }

  return (
    <ActionScreen
      bar={t.title}
      steps={journey}
      title={withReserves ? t.pvTitle : t.conformTitle}
      lead={withReserves ? t.pvIntro : t.conformText(reception.artisanName)}
      meta={meta}
      footer={<ActionSubmit label={t.submit} onPress={submit} loading={pending} />}
    >
      {withReserves ? null : (
        <SoftBanner icon={Info}>
          <Text style={styles.text}>
            <Text style={styles.strong}>{t.important}</Text> {t.conformNext(balance)}
          </Text>
        </SoftBanner>
      )}
      <SectionLabel text={withReserves ? t.pvLabel : t.pvTitle} />
      {withReserves ? null : <Text style={styles.text}>{t.pvIntro}</Text>}
      <ReceptionPaper model={model} logoUrl={reception.logoUrl} />
      {withReserves ? (
        <FicheButton
          label={t.editReserves}
          variant="secondary"
          icon={PenLine}
          onPress={() => setStep("reserves")}
        />
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
      <Text style={styles.small}>{t.otp}</Text>
      <Text style={[styles.small, styles.center]}>{t.balanceNext}</Text>
    </ActionScreen>
  );
}

const styles = StyleSheet.create({
  text: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.label },
  strong: { fontFamily: font.bold, color: colors.foreground },
  small: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors["muted-foreground"],
  },
  center: { textAlign: "center" },
});
