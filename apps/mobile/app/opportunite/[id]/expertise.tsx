import { expertiseSchema } from "@menao/validation";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { z } from "zod";
import {
  ActionScreen,
  ActionSubmit,
  ChoicePills,
  SectionLabel,
  SentCard,
} from "@/components/pro/action-kit";
import { FicheCard } from "@/components/pro/fiche-kit";
import { ToolField } from "@/components/pro/tools-kit";
import { fr } from "@/i18n/fr";
import { reportExpertise } from "@/lib/pro-requests";
import { useTrades } from "@/lib/trades";
import { Notice } from "@/ui";
import { withTeamPermission } from "@/components/team-gate";

const t = fr.proExpertise;

/**
 * « Ce chantier a besoin d'une expertise » (F-17, F-18), comme sur le site : l'artisan indique le
 * corps de métier nécessaire ; l'équipe MENAO proposera un artisan adapté au client. `id` : la
 * demande (depuis l'opportunité ou la vue du rendez-vous). Écran d'action « Nette » (lot 10).
 */
function ExpertiseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const trades = useTrades();
  const [trade, setTrade] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<{ trade?: string; message?: string }>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    const parsed = expertiseSchema.safeParse({ trade, message });
    if (!parsed.success) {
      const fields = z.flattenError(parsed.error).fieldErrors;
      setErrors({ trade: fields.trade?.[0], message: fields.message?.[0] });
      return;
    }
    setErrors({});
    setFailure(null);
    setPending(true);
    const failed = await reportExpertise(id, parsed.data.trade, parsed.data.message);
    setPending(false);
    if (failed) return setFailure(failed);
    setSent(true);
  }

  if (sent) {
    return (
      <ActionScreen
        bar={t.bar}
        title={t.title}
        footer={<ActionSubmit label={t.back} variant="secondary" onPress={() => router.back()} />}
      >
        <SentCard text={t.sent} />
      </ActionScreen>
    );
  }
  return (
    <ActionScreen
      bar={t.bar}
      title={t.title}
      lead={t.intro}
      footer={<ActionSubmit label={t.submit} onPress={submit} loading={pending} />}
    >
      {failure ? <Notice tone="error">{failure}</Notice> : null}
      <FicheCard padding={4}>
        <SectionLabel text={t.trade} />
        <ChoicePills
          label={t.trade}
          options={trades.map((item) => ({ value: item.code, label: item.label }))}
          value={trade || null}
          onChange={(code) => {
            setTrade(code);
            setErrors({});
          }}
          error={errors.trade}
        />
      </FicheCard>
      <ToolField
        label={t.message}
        value={message}
        onChangeText={setMessage}
        maxLength={2000}
        multiline
        error={errors.message}
      />
    </ActionScreen>
  );
}

// Réservé selon la place dans l'entreprise (ADR 0241).
export default withTeamPermission("requests", ExpertiseScreen);
