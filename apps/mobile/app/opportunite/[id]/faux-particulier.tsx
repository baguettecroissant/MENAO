import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { reportFakeClient } from "@/lib/pro-requests";
import { Body, Button, Notice, Screen, TextField, Title } from "@/ui";

const t = fr.proFakeClient;

/**
 * « Je pense que ce n'est pas un vrai particulier » (ADR 0157), comme sur le site : ticket pour
 * l'équipe MENAO, qui vérifie la demande en toute discrétion. `id` : la demande.
 */
export default function FakeClientScreen() {
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
      <Screen
        header={<TopBar />}
        footer={<Button label={t.back} variant="secondary" onPress={() => router.back()} />}
      >
        <Title>{t.title}</Title>
        <Notice tone="success">{t.sent}</Notice>
      </Screen>
    );
  }
  return (
    <Screen
      header={<TopBar />}
      footer={<Button label={t.submit} onPress={submit} loading={pending} />}
    >
      <Title>{t.title}</Title>
      <Body muted>{t.intro}</Body>
      {failure ? <Notice tone="error">{failure}</Notice> : null}
      <TextField
        label={t.detail}
        value={detail}
        onChangeText={setDetail}
        maxLength={1000}
        multiline
      />
    </Screen>
  );
}
