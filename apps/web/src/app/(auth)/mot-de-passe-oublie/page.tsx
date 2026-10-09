import { PageShell, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <PageShell title={fr.forgotPassword.title}>
      <p className="mb-4">{fr.forgotPassword.intro}</p>
      <ForgotPasswordForm />
      <p className="mt-6 text-center">
        <TextLink href="/connexion">{fr.magicLink.back}</TextLink>
      </p>
    </PageShell>
  );
}
