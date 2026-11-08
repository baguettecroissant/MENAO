import { QUOTE_REFUSAL_REASONS, type QuoteRefusalReason } from "@menao/core";
import { refuseQuoteSchema } from "@menao/validation";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { z } from "zod";
import { ActionScreen, ActionSubmit, DangerBanner, RadioCards } from "@/components/pro/action-kit";
import { ToolField } from "@/components/pro/tools-kit";
import { fr } from "@/i18n/fr";
import { refuseQuote } from "@/lib/quotes";
import { Notice } from "@/ui";

const t = fr.quote.refusal;
const REASONS = QUOTE_REFUSAL_REASONS.map((value) => ({ value, label: t.reasons[value] }));

/**
 * F-21 : refus du devis, avec la raison et un message facultatif pour l'artisan. Définitif.
 * Écran d'action « Nette » (lot 11) : bandeau rouge clair, raisons en cartes, bouton rouge en bas.
 */
export default function RefuseQuoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reason, setReason] = useState<QuoteRefusalReason | null>(null);
  const [comment, setComment] = useState("");
  const [errors, setErrors] = useState<{ reason?: string; comment?: string }>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    const parsed = refuseQuoteSchema.safeParse({ reason: reason ?? "", comment });
    if (!parsed.success) {
      const fields = z.flattenError(parsed.error).fieldErrors;
      setErrors({ reason: fields.reason?.[0], comment: fields.comment?.[0] });
      return;
    }
    setErrors({});
    setFailure(null);
    setPending(true);
    const error = await refuseQuote(id, parsed.data.reason, parsed.data.comment);
    setPending(false);
    if (error) return setFailure(error);
    router.back();
  }

  return (
    <ActionScreen
      bar={fr.quote.titleFallback}
      title={t.title}
      footer={<ActionSubmit label={t.submit} onPress={submit} loading={pending} danger />}
    >
      <DangerBanner text={t.intro} />
      <RadioCards
        legend={t.reason}
        options={REASONS}
        value={reason}
        onChange={(value) => {
          setReason(value);
          setErrors((prev) => ({ ...prev, reason: undefined }));
        }}
        error={errors.reason}
      />
      <ToolField
        label={t.comment}
        value={comment}
        onChangeText={setComment}
        maxLength={500}
        multiline
        error={errors.comment}
      />
      {failure ? <Notice tone="error">{failure}</Notice> : null}
    </ActionScreen>
  );
}
