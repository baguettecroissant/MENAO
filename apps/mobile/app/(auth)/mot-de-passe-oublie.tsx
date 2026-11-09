import { passwordResetRequestSchema } from "@menao/validation";
import { useState } from "react";
import { z } from "zod";
import { AuthScreen, AuthSwitch } from "@/components/auth-kit";
import { SentCard } from "@/components/pro/action-kit";
import { FicheButton } from "@/components/pro/fiche-kit";
import { ToolField } from "@/components/pro/tools-kit";
import { fr } from "@/i18n/fr";
import { siteLinks } from "@/lib/env";
import { goBack } from "@/lib/navigation";
import { supabase } from "@/lib/supabase";

/**
 * Mot de passe oublié : le lien reçu s'ouvre sur le site, pour choisir un nouveau mot de passe.
 * Refonte « Nette » (lot 13) : logo, grand titre, champ arrondi, bouton pleine largeur, carte de
 * confirmation une fois l'e-mail envoyé.
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit() {
    const parsed = passwordResetRequestSchema.safeParse({ email });
    if (!parsed.success) return setError(z.flattenError(parsed.error).fieldErrors.email?.[0]);
    setError(undefined);
    setPending(true);
    // Même réponse que le compte existe ou non (pas d'énumération des comptes).
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: siteLinks.resetPassword,
    });
    setPending(false);
    setSent(true);
  }

  return (
    <AuthScreen title={fr.auth.resetTitle} lead={fr.auth.resetText}>
      {sent && <SentCard text={fr.auth.resetSent} />}
      <ToolField
        label={fr.auth.email}
        value={email}
        onChangeText={setEmail}
        error={error}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <FicheButton label={fr.auth.resetSubmit} onPress={submit} tall loading={pending} />
      <AuthSwitch label={fr.auth.backToSignIn} onPress={goBack} border={false} />
    </AuthScreen>
  );
}
