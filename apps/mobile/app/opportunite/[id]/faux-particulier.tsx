import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActionScreen, ActionSubmit, SentCard } from "@/components/pro/action-kit";
import { ToolField } from "@/components/pro/tools-kit";
import { fr } from "@/i18n/fr";
import { reportFakeClient } from "@/lib/pro-requests";
import { Notice } from "@/ui";
import { withTeamPermission } from "@/components/team-gate";

const t = fr.proFakeClient;

/**
 * « Je pense que ce n'est pas un vrai particulier » (ADR 0157), comme sur le site : ticket pour
 * l'équipe MENAO, qui vérifie la demande en toute discrétion. `id` : la demande. Écran d'action
 * « Nette » (lot 10).
 */
function FakeClientScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    setFailure(null);
    setPending(true);
    const failed = await reportFakeClient(id, detail);
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
      <ToolField
        label={t.detail}
        value={detail}
        onChangeText={setDetail}
        maxLength={1000}
        multiline
      />
    </ActionScreen>
  );
}

// Réservé selon la place dans l'entreprise (ADR 0241).
export default withTeamPermission("requests", FakeClientScreen);
