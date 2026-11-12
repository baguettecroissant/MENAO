"use client";

import { useFormStatus } from "react-dom";
import { ReadingScreen } from "@/components/pro/reading-screen";
import { Button } from "@/components/ui";
import { rereadPlans } from "@/lib/artisan/tender-actions";

/** Bouton et écran d'attente pendant la nouvelle lecture (F-140). */
function RereadButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <>
      {pending && <ReadingScreen kind="plan" />}
      <Button type="submit" variant="secondary" block={false} disabled={pending}>
        {label}
      </Button>
    </>
  );
}

/** « Relire les plans » : l'IA relit les plans déposés, avec l'écran d'attente animé. */
export function RereadPlansForm({ tenderId, label }: { tenderId: string; label: string }) {
  return (
    <form action={rereadPlans}>
      <input type="hidden" name="tenderId" value={tenderId} />
      <RereadButton label={label} />
    </form>
  );
}
