import { REFUSAL_REASONS, type RefusalReason } from "@menao/core";
import { refusalSchema } from "@menao/validation";
import { router, useLocalSearchParams } from "expo-router";
import { Users } from "lucide-react-native";
import { useState } from "react";
import { z } from "zod";
import { ActionScreen, ActionSubmit, RadioCards } from "@/components/pro/action-kit";
import { SoftBanner } from "@/components/pro/dossier-kit";
import { ToolField } from "@/components/pro/tools-kit";
import { fr } from "@/i18n/fr";
import { refuseRequest } from "@/lib/pro-requests";
import { Notice } from "@/ui";
import { withTeamPermission } from "@/components/team-gate";

const t = fr.proRequests;
const REASONS = REFUSAL_REASONS.map((value) => ({ value, label: t.reasons[value] }));

/**
 * F-17 « Refuser le chantier », comme sur le site : motif de la liste, précisé si « Autre ».
 * Écran d'action « Nette » (lot 10) : raisons en cartes, bouton rouge collé en bas.
 */
function RefuseRequestScreen() {
  const { id, partenaires } = useLocalSearchParams<{ id: string; partenaires?: string }>();
  const [reason, setReason] = useState<RefusalReason | null>(null);
  const [detail, setDetail] = useState("");
  const [errors, setErrors] = useState<{ reason?: string; detail?: string }>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    const parsed = refusalSchema.safeParse({ reason: reason ?? "", detail });
    if (!parsed.success) {
      const fields = z.flattenError(parsed.error).fieldErrors;
      setErrors({ reason: fields.reason?.[0], detail: fields.detail?.[0] });
      return;
    }
    setErrors({});
    setFailure(null);
    setPending(true);
    const error = await refuseRequest(id, parsed.data.reason, parsed.data.detail);
    setPending(false);
    if (error) return setFailure(error);
    router.back();
  }

  return (
    <ActionScreen
      bar={t.refuse}
      title={t.refuseQuestion}
      footer={<ActionSubmit label={t.confirmRefuse} onPress={submit} loading={pending} danger />}
    >
      <RadioCards
        legend={t.refusalLegend}
        hideLegend
        options={REASONS}
        value={reason}
        onChange={(value) => {
          setReason(value);
          setErrors({});
        }}
        error={errors.reason}
      />
      {reason === "autre" ? (
        <ToolField
          label={t.refusalDetail}
          value={detail}
          onChangeText={(value) => {
            setDetail(value);
            setErrors((prev) => ({ ...prev, detail: undefined }));
          }}
          maxLength={500}
          multiline
          error={errors.detail}
        />
      ) : null}
      {partenaires === "1" ? <SoftBanner icon={Users} text={fr.proPartners.afterRefusal} /> : null}
      {failure ? <Notice tone="error">{failure}</Notice> : null}
    </ActionScreen>
  );
}

// Réservé selon la place dans l'entreprise (ADR 0241).
export default withTeamPermission("requests", RefuseRequestScreen);
