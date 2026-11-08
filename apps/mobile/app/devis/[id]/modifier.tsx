import { QUOTE_REVISION_MESSAGE_LIMITS } from "@menao/core";
import { quoteRevisionSchema } from "@menao/validation";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { z } from "zod";
import { ActionScreen, ActionSubmit } from "@/components/pro/action-kit";
import { ToolField } from "@/components/pro/tools-kit";
import { fr } from "@/i18n/fr";
import { requestQuoteRevision } from "@/lib/quotes";
import { Notice } from "@/ui";

const t = fr.quote.revision;

/**
 * F-21 : demande de modification du devis ; l'artisan enverra une nouvelle version. Écran
 * d'action « Nette » (lot 11) : champ en 16 points, bouton collé en bas.
 */
export default function QuoteRevisionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    const parsed = quoteRevisionSchema.safeParse({ message });
    if (!parsed.success) {
      setError(z.flattenError(parsed.error).fieldErrors.message?.[0]);
      return;
    }
    setError(undefined);
    setFailure(null);
    setPending(true);
    const failed = await requestQuoteRevision(id, parsed.data.message);
    setPending(false);
    if (failed) return setFailure(failed);
    router.back();
  }

  return (
    <ActionScreen
      bar={fr.quote.titleFallback}
      title={t.title}
      lead={t.intro}
      footer={<ActionSubmit label={t.submit} onPress={submit} loading={pending} />}
    >
      <ToolField
        label={t.label}
        value={message}
        onChangeText={(value) => {
          setMessage(value);
          setError(undefined);
        }}
        maxLength={QUOTE_REVISION_MESSAGE_LIMITS.max}
        multiline
        error={error}
      />
      {failure ? <Notice tone="error">{failure}</Notice> : null}
    </ActionScreen>
  );
}
