import { ARTISAN_CANCEL_REASONS, type ArtisanCancelReason } from "@menao/core";
import { cancelChantierSchema } from "@menao/validation";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { z } from "zod";
import { ActionScreen, ActionSubmit, DangerBanner, RadioCards } from "@/components/pro/action-kit";
import { PrivacyNote } from "@/components/pro/dossier-kit";
import { ToolField } from "@/components/pro/tools-kit";
import { fr } from "@/i18n/fr";
import { cancelArtisanChantier } from "@/lib/pro-chantiers";
import { Notice } from "@/ui";
import { withTeamPermission } from "@/components/team-gate";

const t = fr.proAppointment;
const CAUSES = ARTISAN_CANCEL_REASONS.map((value) => ({ value, label: t.cancelCauses[value] }));

/**
 * F-18 « Annuler le chantier », comme sur le site : motif pour l'équipe (signalement, ADR 0145),
 * message facultatif pour le client. Définitif. Écran d'action « Nette » (lot 10) : bandeau rouge
 * clair, motifs en cartes, bouton rouge collé en bas.
 */
function CancelArtisanChantierScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [cause, setCause] = useState<ArtisanCancelReason | null>(null);
  const [reason, setReason] = useState("");
  const [causeError, setCauseError] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    const parsed = cancelChantierSchema.safeParse({ cause: cause ?? "", reason });
    if (!parsed.success) {
      const fields = z.flattenError(parsed.error).fieldErrors;
      setCauseError(fields.cause?.[0]);
      setError(fields.reason?.[0]);
      return;
    }
    setCauseError(undefined);
    setError(undefined);
    setFailure(null);
    setPending(true);
    const failed = await cancelArtisanChantier(id, parsed.data.cause, parsed.data.reason);
    setPending(false);
    if (failed) return setFailure(failed);
    router.back();
  }

  return (
    <ActionScreen
      bar={t.cancelBar}
      title={t.cancelTitle}
      footer={<ActionSubmit label={t.cancelConfirm} onPress={submit} loading={pending} danger />}
    >
      <DangerBanner text={t.cancelIntro} />
      <RadioCards
        legend={t.cancelCauseLegend}
        options={CAUSES}
        value={cause}
        onChange={(value) => {
          setCause(value);
          setCauseError(undefined);
        }}
        error={causeError}
      />
      <PrivacyNote text={t.cancelCauseHint} />
      <ToolField
        label={t.cancelReason}
        value={reason}
        onChangeText={(value) => {
          setReason(value);
          setError(undefined);
        }}
        maxLength={500}
        multiline
        error={error}
      />
      {failure ? <Notice tone="error">{failure}</Notice> : null}
    </ActionScreen>
  );
}

// Réservé selon la place dans l'entreprise (ADR 0241).
export default withTeamPermission("chantierDecisions", CancelArtisanChantierScreen);
