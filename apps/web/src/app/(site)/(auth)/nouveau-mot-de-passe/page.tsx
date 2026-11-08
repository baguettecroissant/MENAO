import { PageShell } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { NewPasswordForm } from "./new-password-form";

export default function NewPasswordPage() {
  return (
    <PageShell title={fr.resetPassword.title}>
      <NewPasswordForm />
    </PageShell>
  );
}
