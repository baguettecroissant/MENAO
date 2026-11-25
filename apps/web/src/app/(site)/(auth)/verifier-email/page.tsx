import { PageShell } from "@/components/ui";
import { fr } from "@/i18n/fr";

export default function VerifyEmailPage() {
  return (
    <PageShell title={fr.verifyEmail.title}>
      <p>{fr.verifyEmail.body}</p>
      <p className="text-sm text-muted-foreground">{fr.verifyEmail.spam}</p>
    </PageShell>
  );
}
