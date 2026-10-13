import { REFUSAL_REASONS, type RefusalReason } from "@menao/core";
import { refusalSchema } from "@menao/validation";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { z } from "zod";
import { RadioGroup } from "@/components/radio-group";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { refuseRequest } from "@/lib/pro-requests";
import { Button, Notice, Screen, TextField, Title } from "@/ui";

const t = fr.proRequests;
const REASONS = REFUSAL_REASONS.map((value) => ({ value, label: t.reasons[value] }));

/** F-17 « Refuser le chantier », comme sur le site : motif de la liste, précisé si « Autre ». */
export default function RefuseRequestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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
    <Screen header={<TopBar />}>
      <Title>{t.refuse}</Title>
      <RadioGroup
        legend={t.refusalLegend}
        options={REASONS}
        value={reason}
        onChange={(value) => {
          setReason(value);
          setErrors({});
        }}
        error={errors.reason}
      />
      {reason === "autre" ? (
        <TextField
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
      {failure ? <Notice tone="error">{failure}</Notice> : null}
      <Button label={t.confirmRefuse} onPress={submit} loading={pending} />
    </Screen>
  );
}
