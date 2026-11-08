import { appointmentNotesSchema } from "@menao/validation";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { z } from "zod";
import { ActionScreen, ActionSubmit } from "@/components/pro/action-kit";
import { ToolField } from "@/components/pro/tools-kit";
import { fr } from "@/i18n/fr";
import { saveAppointmentNotes } from "@/lib/pro-chantiers";
import { Notice } from "@/ui";

const t = fr.proAppointment;

/**
 * F-18 « Ajouter des notes », comme sur le site : notes privées, visibles par l'artisan seul.
 * Écran d'action « Nette » (lot 10), bouton collé en bas.
 */
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
    <ActionScreen
      bar={t.notesBar}
      title={t.notes}
      lead={t.notesHint}
      footer={<ActionSubmit label={t.saveNotes} onPress={save} loading={pending} />}
    >
      <ToolField
        label={t.notesField}
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
    </ActionScreen>
  );
}
