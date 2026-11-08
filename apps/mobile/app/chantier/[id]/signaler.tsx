import {
  DISPUTE_CATEGORIES,
  DISPUTE_DESCRIPTION_LIMITS,
  reportSuspendsChantier,
  type DisputeCategory,
} from "@menao/core";
import { problemReportSchema } from "@menao/validation";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Info } from "lucide-react-native";
import { useCallback, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { z } from "zod";
import { ActionScreen, ActionSubmit, ChoicePills, SectionLabel } from "@/components/pro/action-kit";
import { SoftBanner } from "@/components/pro/dossier-kit";
import { FicheCard, FicheScreen, FicheSkeleton } from "@/components/pro/fiche-kit";
import { ToolField } from "@/components/pro/tools-kit";
import { fr } from "@/i18n/fr";
import { loadReportContext, reportProblem } from "@/lib/disputes";
import { useSession } from "@/lib/session";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.dispute;
const CATEGORIES = DISPUTE_CATEGORIES.map((value) => ({ value, label: t.categories[value] }));

/**
 * « Signaler un problème lié au chantier » (F-42), comme sur le site : nature du problème et
 * description ; un chantier actif passe en litige. Un signalement déjà ouvert est suivi plutôt
 * que d'en créer un autre. Écran d'action « Nette » (lot 10), commun au client et à l'artisan :
 * chantier rappelé, nature du problème en pastilles, description, bouton collé en bas.
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

  if (detail === undefined) return <FicheSkeleton title={t.bar} />;
  if (detail === null) {
    return (
      <FicheScreen title={t.bar}>
        <Notice tone="error">{fr.chantier.notFound}</Notice>
      </FicheScreen>
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
    <ActionScreen
      bar={t.bar}
      title={t.reportTitle}
      lead={t.intro}
      footer={<ActionSubmit label={t.submit} onPress={submit} loading={pending} />}
    >
      <FicheCard padding={4} gap={1}>
        <Text style={styles.eyebrow}>{t.chantierLabel}</Text>
        <Text style={styles.chantier}>{context.title}</Text>
      </FicheCard>
      <SoftBanner
        icon={Info}
        text={reportSuspendsChantier(context.status) ? t.suspends : t.noSuspension}
      />
      <FicheCard padding={4}>
        <SectionLabel text={t.categoryLegend} />
        <ChoicePills
          label={t.categoryLegend}
          options={CATEGORIES}
          value={category}
          onChange={(value) => {
            setCategory(value);
            setErrors((prev) => ({ ...prev, category: undefined }));
          }}
          error={errors.category}
        />
        <ToolField
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
      </FicheCard>
      {failure ? <Notice tone="error">{failure}</Notice> : null}
    </ActionScreen>
  );
}

const { colors, font } = theme;
const styles = StyleSheet.create({
  eyebrow: { fontFamily: font.semibold, fontSize: 13, color: colors["muted-foreground"] },
  chantier: { fontFamily: font.bold, fontSize: 16, lineHeight: 22, color: colors.foreground },
});
