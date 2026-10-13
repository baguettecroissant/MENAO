import { appointmentNotesSchema } from "@menao/validation";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { z } from "zod";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { saveAppointmentNotes } from "@/lib/pro-chantiers";
import { Body, Button, Notice, Screen, TextField, Title } from "@/ui";

const t = fr.proAppointment;

/** F-18 « Ajouter des notes », comme sur le site : notes privées, visibles par l'artisan seul. */
export default function NotesScreen() {
  const { id, notes: initial = "" } = useLocalSearchParams<{ id: string; notes?: string }>();
  const [notes, setNotes] = useState(initial);
  const [error, setError] = useState<string | undefined>(undefined);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save() {
    const parsed = appointmentNotesSchema.safeParse({ notes });
    if (!parsed.success) {
      setError(z.flattenError(parsed.error).fieldErrors.notes?.[0]);
      return;
    }
    setError(undefined);
    setFailure(null);
    setPending(true);
    const failed = await saveAppointmentNotes(id, parsed.data.notes);
    setPending(false);
    if (failed) return setFailure(failed);
    router.back();
  }

  return (
    <Screen header={<TopBar />}>
      <Title>{t.notes}</Title>
      <Body muted>{t.notesHint}</Body>
      <TextField
        label={t.notes}
        value={notes}
        onChangeText={(value) => {
          setNotes(value);
          setError(undefined);
        }}
        maxLength={5000}
        multiline
        autoFocus
        error={error}
      />
      {failure ? <Notice tone="error">{failure}</Notice> : null}
      <Button label={t.saveNotes} onPress={save} loading={pending} />
    </Screen>
  );
}
