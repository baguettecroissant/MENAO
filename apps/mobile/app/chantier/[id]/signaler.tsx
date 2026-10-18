import {
  DISPUTE_CATEGORIES,
  DISPUTE_DESCRIPTION_LIMITS,
  reportSuspendsChantier,
  type DisputeCategory,
} from "@menao/core";
import { problemReportSchema } from "@menao/validation";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { z } from "zod";
import { RadioGroup } from "@/components/radio-group";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { loadReportContext, reportProblem } from "@/lib/disputes";
import { useSession } from "@/lib/session";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Button, Notice, Screen, ScreenSkeleton, TextField, Title } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.dispute;
const CATEGORIES = DISPUTE_CATEGORIES.map((value) => ({ value, label: t.categories[value] }));

/**
 * « Signaler un problème lié au chantier » (F-42), comme sur le site : nature du problème et
 * description ; un chantier actif passe en litige. Un signalement déjà ouvert est suivi plutôt
 * que d'en créer un autre.
 */
export default function ReportProblemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Même écran pour le client et pour l'artisan du chantier (F-42).
  const artisan = useSession().space === "artisan";
  const load = useCallback(() => loadReportContext(id, artisan), [id, artisan]);
  const [detail] = useFocusData(load);
  const [category, setCategory] = useState<DisputeCategory | null>(null);
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<{ category?: string; description?: string }>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (detail === undefined) return <ScreenSkeleton header={<TopBar />} />;
  if (detail === null) {
    return (
      <Screen header={<TopBar />}>
        <Notice tone="error">{fr.chantier.notFound}</Notice>
      </Screen>
    );
  }
  if (detail.openTicketId) return <Redirect href={`/signalement/${detail.openTicketId}`} />;
  const context = detail;

  async function submit() {
    const parsed = problemReportSchema.safeParse({ category: category ?? "", description });
    if (!parsed.success) {
      const fields = z.flattenError(parsed.error).fieldErrors;
      setErrors({ category: fields.category?.[0], description: fields.description?.[0] });
      return;
    }
    setErrors({});
    setFailure(null);
    setPending(true);
    const result = await reportProblem(id, parsed.data.category, parsed.data.description);
    setPending(false);
    if ("error" in result) return setFailure(result.error);
    router.replace(`/signalement/${result.ticketId}`);
  }

  return (
    <Screen header={<TopBar />}>
      <View style={styles.head}>
        <Title>{t.reportTitle}</Title>
        <Body muted>{t.chantierLink(context.title)}</Body>
      </View>
      <Body>{t.intro}</Body>
      <Notice tone="info">
        {reportSuspendsChantier(context.status) ? t.suspends : t.noSuspension}
      </Notice>
      <RadioGroup
        legend={t.categoryLegend}
        options={CATEGORIES}
        value={category}
        onChange={(value) => {
          setCategory(value);
          setErrors((prev) => ({ ...prev, category: undefined }));
        }}
        error={errors.category}
      />
      <TextField
        label={t.descriptionLabel}
        hint={t.descriptionHint}
        value={description}
        onChangeText={(value) => {
          setDescription(value);
          setErrors((prev) => ({ ...prev, description: undefined }));
        }}
        maxLength={DISPUTE_DESCRIPTION_LIMITS.max}
        multiline
        error={errors.description}
      />
      {failure ? <Notice tone="error">{failure}</Notice> : null}
      <Button label={t.submit} onPress={submit} loading={pending} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { gap: theme.spacing(1) },
});
