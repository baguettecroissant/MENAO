import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { QuotePaper } from "@/components/documents/quote-paper";
import { StepTabs } from "@/components/step-tabs";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { sharePdf } from "@/lib/pdf";
import { loadQuoteSendContext } from "@/lib/pro-quotes";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Button, LinkText, Notice, Screen, Title } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proQuote;
const STEPS = [
  { key: "preview", label: t.steps.preview },
  { key: "send", label: t.steps.send },
] as const;

/** Aperçu du devis (F-20), comme sur le site : le devis tel qu'il sera envoyé, puis l'envoi. */
export default function QuotePreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const load = useCallback(() => loadQuoteSendContext(id), [id]);
  const [context] = useFocusData(load);
  const [pdfFailed, setPdfFailed] = useState(false);

  if (context === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }
  // Pas encore de ligne enregistrée : retour à l'éditeur.
  if (context === null) return <Redirect href={`/pro-chantier/${id}/devis`} />;

  return (
    <Screen
      header={<TopBar />}
      footer={
        <Button label={t.next} onPress={() => router.push(`/pro-chantier/${id}/devis/envoi`)} />
      }
    >
      <StepTabs steps={STEPS} current="preview" />
      <Title>{t.preview.ready}</Title>
      <Body muted>{t.preview.check(context.client.firstName)}</Body>
      <QuotePaper model={context.model} />
      <LinkText
        label={t.preview.pdf}
        onPress={async () => {
          setPdfFailed(false);
          setPdfFailed(!(await sharePdf({ quoteId: context.quoteId }, "devis")));
        }}
      />
      {pdfFailed ? <Notice tone="error">{fr.pdf.failed}</Notice> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
});
